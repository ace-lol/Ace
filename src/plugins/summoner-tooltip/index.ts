"use strict";

import { PluginDescription } from "../../plugin";
import { simple_promise_fetch } from "../../util";

import "./style";

export default (<PluginDescription>{
    name: "summoner-tooltip",
    version: "0.1.0",
    description: "Shows tooltips with information about a summoner in champion select.",
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "1.0.x",
        "rcp-fe-lol-uikit": "*"
    },
    setup() {
        let uikit: any;
        this.postinit("rcp-fe-lol-uikit", p => {
            uikit = p.api;
        });

        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, uikit);
            }, "champion-select");
        });
    }
});

const Mixin = (Ember: any, uikit: any) => ({
    // Fired whenever the amount of players on our team changes.
    teamObserver: Ember.observer("session.myTeam.[]", function() {
        // After the elements have been rendered.
        Ember.run.scheduleOnce('afterRender', this, function() {
            this.get("session.myTeam").forEach((member: any) => addTooltip.call(this, Ember, uikit, member));
        });
    })
});

function addTooltip(Ember: any, uikit: any, member: any) {
    // Pointer events are disabled by default. We need
    // to enable them, otherwise tooltips won't work.
    this.$(".party")[0].style.pointerEvents = "all";

    const el = this.$(".summoner-wrapper[data-summoner-name='" + member.displayName + "'] .champion-container")[0];

    const render = () => {
        const root = document.createElement("lol-uikit-tooltip");
        root.className = "summoner-tooltip";
                
        const body = document.createElement("lol-uikit-content-block");
        body.setAttribute("type", "tooltip-small");
        body.innerHTML = "<div class='loading-spinner'></div>";

        // We have no access to the summoner id, so we have to look that up first.
        simple_promise_fetch(`/lol-summoner/v1/summoners?name=${encodeURIComponent(member.displayName)}`).then(json => {
            // Look up the stats.
            // TODO(molenzwiebel): Losses are incorrect, read the TODO later in this file.
            return simple_promise_fetch(`/lol-leagues/v1/summoner-leagues/${JSON.parse(json).summonerId}`);
        }).then(json => {
            const data: RankedStats[] = JSON.parse(json);
            const relevant = data.filter(x => x.queueType === this.get("queue.type"))[0];

            if (!relevant) {
                // If there are no stats for this queue, bail.
                body.innerHTML = `<h6>${member.displayName}</h6><p><i>No ranked stats for this queue</i></p>`;
                return;
            }

            // Find the data for the appropriate player.
            const playerData = relevant.leagues.filter(x => x.leagueRank === relevant.requesterLeagueRank)[0].standings.filter(x => x.name === member.displayName)[0];

            // Formats `In Placements`, `Silver IV - 20 LP`, `Masters - 320 LP`
            const hasTiers = (x: string) => x !== "MASTER" && x != "CHALLENGER";
            const tier = relevant.leagueTier === "PROVISIONAL"
                ? "In Placements"
                : (TIERS[relevant.leagueTier] + (hasTiers(relevant.leagueTier) ? ` ${relevant.requesterLeagueRank}` : "") + ` - ${playerData.points} LP`);

            // If the player is in a series, prints `In Series: W--`, `In Series: LLW--`.
            const promoData = playerData.miniseriesResults.length ? "<p><i>In Series: </i> ${playerData.miniseriesResults.map(x => x === 'N' ? '-' : x).join()}</p>" : "";
            
            // TODO(molenzwiebel): Losses are not correct for other players.
            // Only fix seems to be to get the data from the League API, instead of
            // the built-in APIs. That requires a token though...
            const winrate = playerData.wins / (playerData.wins + playerData.losses) * 100;

            body.innerHTML = `
                <h6>${member.displayName}</h6>
                <p>${tier}</p>
                ${promoData}
                <p>${playerData.wins}W/${playerData.losses}L (${winrate.toFixed(1)}%)</p>
            `;
        }).catch(err => {
            // Log error, then inform the user of the error.
            console.dir(err);
            body.innerHTML = `<h6>Error</h6><p>Error loading ranked stats:</p><p>${err}</p>`;
        });

        root.appendChild(body);
        return root;
    };
    
    // Attach the tooltip to the element.
    uikit.getTooltipManager().assign(el, render, {}, {
        targetAnchor: {
            x: "left",
            y: "top"
        },
        tooltipAnchor: {
            x: "left",
            y: "bottom"
        },
        hideEvent: "mouseleave"
    });
}

interface RankedStats {
    leagueTier: string;
    leagues: League[];
    name: string;
    queueType: string;
    requesterLeagueRank: string;
}

interface League {
    leagueRank: string;
    standings: [{
        miniseriesResults: string[];
        losses: number;
        wins: number;
        name: string;
        points: number;
    }]
}

const TIERS: { [key: string]: string } = {
    "BRONZE": "Bronze",
    "SILVER": "Silver",
    "GOLD": "Gold",
    "PLATINUM": "Platinum",
    "DIAMOND": "Diamond",
    "MASTER": "Masters",
    "CHALLENGER": "Challenger"
};