const container = document.querySelector('.popup-container');

let id = 0;
let offsetRect = null;
const options = []

window.electronAPI.onMessage((e, data) => {
    // console.log(e, JSON.stringify(data), id)
    if (e === "ctx-menu") {
        container.replaceChildren();

        for (let i = 0; i < data.options.length; i++) {
            const actionOption = data.options[i];
            const hasOption = actionOption.options !== undefined;
            const actionElement = document.createElement("button");

            options.push({
                option: actionOption,
                element: actionElement,
                hasOption: hasOption
            });

            actionElement.classList.add("popup-action");
            actionElement.innerHTML = hasOption ? actionOption.title + `
                <svg xmlns="http://www.w3.org/2000/svg" width="0.75em" height="1.5em" viewBox="0 0 12 24">
                    <defs>
                        <path id="SVG1pzpbdYY" fill="currentColor" color="#bababa"
                              d="m7.588 12.43l-1.061 1.06L.748 7.713a.996.996 0 0 1 0-1.413L6.527.52l1.06 1.06l-5.424 5.425z"/>
                    </defs>
                    <use fill-rule="evenodd" href="#SVG1pzpbdYY" transform="rotate(-180 5.02 9.505)"/>
                </svg>
            ` : actionOption.title;
            actionElement.onclick = (e) => {
                window.electronAPI.sendMessage("ctx-menu", actionOption.id);
            }

            container.appendChild(actionElement);
        }

        const rect = getFullBounds(container);
        window.electronAPI.sendMessage("resolve-ctx", {
            rect: rect,
            id: id,
            offset: data.rect
        });
    }
    if (e === "init-ctx-menu") {
        offsetRect = data.offsetRect;
        options.forEach((item) => {
            item.element.onpointerover = (e) => {
                let targetRect = {x: -1, y: -1, width: -1, height: -1};

                if (offsetRect != null) {
                    const bound = item.element.getBoundingClientRect();
                    targetRect.x = offsetRect.x + bound.x;
                    targetRect.y = offsetRect.y + bound.y;
                    targetRect.width = bound.width;
                    targetRect.height = bound.height;
                }

                window.electronAPI.sendMessage("ctx-over", {
                    id: item.option.id,
                    rect: targetRect,
                    hasOption: item.hasOption
                });
            };

            item.element.onpointerleave = (e) => {
                window.electronAPI.sendMessage("ctx-leave", item.option.id);
            };
        })
    }
    if (e === "ctx-id") {
        id = data;
    }
})

function parseBoxShadowExtents(shadowStr) {
    let extraTop = 0, extraRight = 0, extraBottom = 0, extraLeft = 0;

    if (!shadowStr || shadowStr === 'none') {
        return {extraTop, extraRight, extraBottom, extraLeft};
    }

    // Split multiple shadows by comma, but not commas inside color functions
    const shadows = shadowStr.split(/,(?![^(]*\))/);

    for (const s of shadows) {
        const trimmed = s.trim();
        if (trimmed.includes('inset')) continue;

        // Strip color values first to avoid parsing their numbers as offsets
        // Handles: rgb(), rgba(), hsl(), hsla(), hwb(), oklch(), color(), #hex, named colors
        const stripped = trimmed
            .replace(/\b(?:rgb|rgba|hsl|hsla|hwb|oklch|oklab|lch|lab|color|color-mix)\s*\([^)]*\)/gi, '')
            .replace(/#[0-9a-fA-F]{3,8}\b/g, '')
            .replace(/\b(?:transparent|currentcolor|inherit|initial|unset|black|white|red|blue|green|yellow|purple|orange|pink|gray|grey)\b/gi, '')
            .trim();

        // Now extract the numeric values: offsetX offsetY blur? spread?
        const nums = stripped.match(/-?\d+\.?\d*(?:px|rem|em|%)?/g);
        if (!nums) continue;

        // Convert all to px-equivalent floats (rem/em approximation)
        const toFloat = (v) => {
            if (!v) return 0;
            if (v.endsWith('rem')) return parseFloat(v) * 16;
            if (v.endsWith('em')) return parseFloat(v) * 16; // approximation
            return parseFloat(v);
        };

        const offsetX = toFloat(nums[0]);
        const offsetY = toFloat(nums[1]);
        const blur = toFloat(nums[2] ?? '0');
        const spread = toFloat(nums[3] ?? '0');

        extraRight = Math.max(extraRight, offsetX + blur + spread);
        extraLeft = Math.max(extraLeft, -offsetX + blur + spread);
        extraBottom = Math.max(extraBottom, offsetY + blur + spread);
        extraTop = Math.max(extraTop, -offsetY + blur + spread);
    }

    // Clamp — a shadow fully behind the element adds nothing
    return {
        extraTop: Math.max(0, extraTop),
        extraRight: Math.max(0, extraRight),
        extraBottom: Math.max(0, extraBottom),
        extraLeft: Math.max(0, extraLeft),
    };
}

function getFullBounds(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);

    const {extraTop, extraRight, extraBottom, extraLeft} =
        parseBoxShadowExtents(style.boxShadow);

    const outline = parseFloat(style.outlineWidth) || 0;

    return {
        top: rect.top - extraTop - outline,
        left: rect.left - extraLeft - outline,
        bottom: rect.bottom + extraBottom + outline,
        right: rect.right + extraRight + outline,
        width: rect.width + extraLeft + extraRight + outline * 2,
        height: rect.height + extraTop + extraBottom + outline * 2,
        extraTop: extraTop,
        extraRight: extraRight,
        extraBottom: extraBottom,
        extraLeft: extraLeft
    };
}

window.addEventListener('keydown', (e) => {
    if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key.toLowerCase() === 'r')
    ) {
        e.preventDefault();
    }
});

window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
});