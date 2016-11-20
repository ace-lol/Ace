"use strict";

import { PluginDescription } from "../../plugin";
import { RegisterElementParams } from "../../hook-providers/register-element";
import { simple_promise_fetch } from "../../util";

import ROSTER_HTML = require("./roster.html");
import GROUP_HTML = require("./group.html");
import "./style";

export default (<PluginDescription>{
    name: "recently-played",
    version: "1.0.0",
    description: "Adds a recently played tab that allows you to see and invite anyone you recently played with.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-social": "~1.0.653-any"
    },
    setup() {
        let unregisterRoster = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector("lol-uikit-scrollable#list")) {
                (<HTMLElement>doc.querySelector("lol-uikit-scrollable#list .list-content:not(#no-friends):not(#no-online-friends)")).outerHTML = ROSTER_HTML;
                unregisterRoster();
            }
        });

        let unregisterGroup = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector("#group > #groupHeader")) {
                (<HTMLElement>doc.querySelector("#group")).innerHTML = GROUP_HTML;
                unregisterGroup();
            }
        });

        let unregisterElement = this.hook("register-element", (args: RegisterElementParams) => {
            const proto: any = args.prototype;

            proto.loading = false;
            proto.startedInitialLoad = false;
            proto.startLoad = function(event?: MouseEvent) {
                if (this.loading) return;
                if (event) event.stopPropagation();
                this.recentPlayers = [];
                this.loading = true;
                this.startedInitialLoad = true;

                simple_promise_fetch("/lol-match-history/v1/recently-played-summoners").then(json => {
                    this.loading = false;
                    this.loaded = true;

                    this.recentPlayers = JSON.parse(json);
                    this.recentPlayers.forEach((p: any) => {
                        p.championIconUrl = "/lol-game-data/assets/v1/champion-icons/" + p.championId + ".png";
                    });
                    this.recentPlayers.sort((a: any, b: any) => {
                        // Sort by newest first.
                        return new Date(b.gameCreationDate).getTime() - new Date(a.gameCreationDate).getTime();
                    });

                    this.queueRepaint();
                });

                return "";
            };

            proto.onRecentDragStart = function(event: DragEvent, member: any) {
                const dataTransfer = event.dataTransfer;
                
                dataTransfer.setData("application/riot.roster-member+json", JSON.stringify({
                    type: "roster-member",
                    id: member.summonerId,
                    name: member.summonerName
                }));
                
                dataTransfer.setData("application/riot.chat-user+json", JSON.stringify({
                    type: "chat-user",
                    id: member.summonerId,
                    name: member.summonerName
                }));

                dataTransfer.setData("application/riot.player+json", JSON.stringify({
                    type: "player",
                    id: member.summonerId,
                    name: member.summonerName
                }));
            };

            proto.onRecentRightClick = function(event: MouseEvent, member: any) {
                // There must be a lobby, not in queue, you must be able to invite, the player cannot already be in the lobby.
                const canInvite = this.data.lobby && !this.data.gameSearch && this.data.lobby.members.some((lobbyMember: any) => {
                    return lobbyMember.id === this.data.me.id && lobbyMember.canInviteOthers;
                }) && !this.data.lobby.members.some((lobbyMember: any) => {
                    return lobbyMember.id === member.summonerId;
                });

                const actions = [{
                    action: "viewRecentProfile",
                    target: this,
                    label: "View Profile"
                }, {
                    action: "inviteRecent",
                    target: this,
                    label: "Invite to Game",
                    disabled: !canInvite
                }];

                this.data.contextMenuManager.close();
                if (this.data.contextMenuManager.filterVisible(actions).length) {
                    this.activeMember = member;
                    this.data.contextMenuManager.setMenuItems(actions);
                    this.data.contextMenuManager.openAtEvent(event);
                }
            };

            proto.viewRecentProfile = function() {
                this.data.profilePlugin.showOverlay({
                    summonerId: this.activeMember.summonerId
                });
            };

            proto.inviteRecent = function() {
                this.data.queueEligibility.getEligibility(this.activeMember.summonerId).then((result: any) => {
                    if (result.eligible) {
                        this.data.inviteToGame(this.activeMember.summonerId);
                    } else {
                        if (!result.restrictions) {
                            // Player was not online or there was no good reason.
                            this.sounds.gameInviteFailed.play();
                            this.toast(this.t("parties_player_ineligible_to_join", {
                                player: this.activeMember.summonerName
                            }));
                        } else {
                            const restriction = result.restrictions[0];
                            this.sounds.gameInviteFailed.play();
                            this.toast(this.t("parties_queue_restriction_player_prefix", {
                                player: this.activeMember.summonerName,
                                reason: this.t("parties_queue_restriction_player_" + restriction.restrictionCode, restriction.restrictionArgs || {})
                            }));
                        }
                    }
                });
            };

            unregisterElement();
        }, "lol-social-roster-group");
    }
});