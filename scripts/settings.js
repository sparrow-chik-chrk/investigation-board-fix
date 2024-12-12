export const MODULE_ID = "investigation-board";

export const registerSettings = function() {


    const refreshAllDrawings = () => {
        if (canvas.drawings) {
            canvas.drawings.placeables.forEach(drawing => {
                if (drawing.document.flags[MODULE_ID]) {
                    drawing.refresh();
                }
            });
        }
    };

    game.settings.register(MODULE_ID, "pinColor", {
        name: "Pin Color",
        hint: "Choose the color of the pin for notes. Selecting 'Random' will randomly assign a pin color.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            random: "Random",
            red: "Red",
            blue: "Blue",
            yellow: "Yellow",
            green: "Green"
        },
        default: "random",
        onChange: () => {
            if (canvas.drawings) {
                canvas.drawings.placeables.forEach(drawing => drawing.refresh());
            }
        }
    });
    

    // Register existing settings
    game.settings.register(MODULE_ID, "stickyNoteWidth", {
        name: "Sticky Note Width",
        hint: "The width (in pixels) for all newly created sticky notes (default: 200).",
        scope: "world",
        config: true,
        type: Number,
        default: 200,
        onChange: () => refreshAllDrawings()
    });

    game.settings.register(MODULE_ID, "photoNoteWidth", {
        name: "Photo Note Width",
        hint: "The width (in pixels) for all newly created photo notes (default: 225).",
        scope: "world",
        config: true,
        type: Number,
        default: 225,
        onChange: () => refreshAllDrawings()
    });

    game.settings.register(MODULE_ID, "baseFontSize", {
        name: "Base Font Size",
        hint: "The font size (in pixels) for text when the note width is at its default size (default: 18).",
        scope: "world",
        config: true,
        type: Number,
        default: 18,
        onChange: () => refreshAllDrawings()
    });

    game.settings.register(MODULE_ID, "font", {
        name: "Font",
        hint: "Choose the font to be used in notes.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "Rock Salt": "Rock Salt",
            "Courier New": "Courier New",
            "Times New Roman": "Times New Roman",
            "Signika": "Signika",
            "Arial": "Arial"
        },
        default: "Rock Salt",
        onChange: () => refreshAllDrawings()
    });

    game.settings.register(MODULE_ID, "stickyNoteDefaultText", {
        name: "Default Sticky Note Text",
        hint: "The default text to use for new sticky notes.",
        scope: "world",
        config: true,
        type: String,
        default: "Clue",
        onChange: () => refreshAllDrawings()
    });

    game.settings.register(MODULE_ID, "photoNoteDefaultText", {
        name: "Default Photo Note Text",
        hint: "The default text to use for new photo notes.",
        scope: "world",
        config: true,
        type: String,
        default: "Suspect/Place",
        onChange: () => refreshAllDrawings()
    });

    // Register base font size and character limits
    game.settings.register(MODULE_ID, "baseCharacterLimits", {
        name: "Base Character Limits",
        hint: "The base character limits for each font and note type. Edit this JSON to customize.",
        scope: "world",
        config: false, // Hidden from the settings UI
        type: Object,
        default: {
            "Rock Salt": { sticky: 60, photo: 13 },
            "Courier New": { sticky: 90, photo: 16 },
            "Times New Roman": { sticky: 80, photo: 20 },
            "Signika": { sticky: 80, photo: 20 },
            "Arial": { sticky: 80, photo: 20 }
        }
    });
};
