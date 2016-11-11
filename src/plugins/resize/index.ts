"use strict";

import { PluginDescription } from "../../plugin";

import "./style";

export default (<PluginDescription>{
    name: "resize",
    version: "0.1.0",
    description: "Allows you to resize the client, as long as it keeps its standard aspect ratio.",
    setup() {
        // UIKit layer manager puts something in document.body. We want to insert _after_ that, so that we are on top.
        // TODO(molenzwiebel): Save the scale somewhere.
        // TODO(molenzwiebel): Scale the lol-uikit-layer-manager without losing the absolute positioning.
        this.postinit("rcp-fe-lol-uikit", () => {
            const resizer = document.createElement("div");
            resizer.className = "resize-handle";
            document.body.appendChild(resizer);

            const viewport = document.getElementById("rcp-fe-viewport-root")!;

            // State variables for during the dragging.
            let [initialWidth, initialHeight, currentWidth, currentHeight, currentX, currentY] = [0, 0, 0, 0, 0, 0];

            const dragMove = (event: MouseEvent) => {
                let newHeight = 0;
                let newWidth = 0;

                if (Math.abs(event.pageX - currentX) > Math.abs(event.pageY - currentY)) {
                    newWidth = currentWidth + (event.pageX - currentX);
                    newHeight = newWidth * (currentHeight / currentWidth);
                } else {
                    newHeight = currentHeight + (event.pageY - currentY);
                    newWidth = newHeight * (currentWidth / currentHeight);
                }

                // Use builtin riot apis to resize the window.
                (<any>window).riotInvoke({ request: JSON.stringify({ name:"Window.ResizeTo", params: [newWidth, newHeight] }) });

                viewport.style.transform = `scale(${newWidth / 1280}) translateZ(0)`;
                viewport.style.transformOrigin = "0 0";
                viewport.style.webkitFilter = "blur(0)"; // Seems to fix a bit of the blurryness.
            };

            const dragStart = (event: MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();

                currentX = event.pageX;
                currentY = event.pageY;

                currentWidth = initialWidth = document.body.offsetWidth;
                currentHeight = initialHeight = document.body.offsetHeight;

                window.addEventListener("mousemove", dragMove);
            };

            const dragEnd = (event: MouseEvent) => {
                window.removeEventListener("mousemove", dragMove);
            };

            resizer.addEventListener("mousedown", dragStart);
            window.addEventListener("mouseup", dragEnd);
        });
    }
});