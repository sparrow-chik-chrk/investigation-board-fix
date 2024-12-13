import { registerSettings } from "./settings.js";

const MODULE_ID = "investigation-board";
const BASE_FONT_SIZE = 18;
const PIN_COLORS = ["redPin.webp", "bluePin.webp", "yellowPin.webp", "greenPin.webp"];


function getBaseCharacterLimits() {
  return game.settings.get(MODULE_ID, "baseCharacterLimits");
}

function getDynamicCharacterLimits(font, currentFontSize) {
  const baseLimits = getBaseCharacterLimits()[font] || { sticky: 60, photo: 15 };
  const scaleFactor = BASE_FONT_SIZE / currentFontSize; // Inverse scaling

  return {
      sticky: Math.round(baseLimits.sticky * scaleFactor),
      photo: Math.round(baseLimits.photo * scaleFactor),
  };
}

function getNestedProperty(obj, path, defaultValue) {
  return path.split('.').reduce((acc, part) => acc && acc[part] ? acc[part] : undefined, obj) || defaultValue;
}

class CustomDrawingSheet extends DrawingConfig {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["custom-drawing-sheet"],
      template: "modules/investigation-board/templates/drawing-sheet.html",
      width: 400,
      height: "auto",
      title: "Note Configuration",
    });
  }

  getData(options) {
    const data = super.getData(options);
    data.noteType = this.object.flags[MODULE_ID]?.type || "sticky";
    data.text = this.object.flags[MODULE_ID]?.text || "Default Text";
    data.image = this.object.flags[MODULE_ID]?.image || "modules/investigation-board/assets/placeholder.webp";
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".file-picker-button").click((event) => {
      new FilePicker({
        type: "image",
        current: this.object.flags[MODULE_ID]?.image || "",
        callback: (path) => {
          html.find("input[name='image']").val(path);
        },
      }).render(true);
    });

    html.find(".save-button").click((event) => {
      event.preventDefault();
      this._onSubmit(event);
    });
  }

  async _updateObject(event, formData) {
    const updates = {
      "flags.investigation-board.type": formData.noteType,
      "flags.investigation-board.text": formData.text,
      "flags.investigation-board.image": formData.image || "modules/investigation-board/assets/placeholder.webp",
    };

    await this.object.update(updates);

    const drawing = canvas.drawings.get(this.object.id);
    if (drawing) {
      drawing.refresh();
    }
  }
}

class CustomDrawing extends Drawing {
  constructor(...args) {
    super(...args);
    this.bgSprite = null;
    this.fgSprite = null;
    this.noteText = null;
  }

  async draw() {
    await super.draw();
    await this._updateSprites();
    return this;
  }

  async refresh() {
    await super.refresh();
    await this._updateSprites();
    this._customizeControls();
  }

  async _updateSprites() {
    const noteData = this.document.flags[MODULE_ID];
    if (!noteData) return;

    // Determine note dimensions
    const width = noteData.type === "photo"
        ? game.settings.get(MODULE_ID, "photoNoteWidth")
        : game.settings.get(MODULE_ID, "stickyNoteWidth");

    const height = noteData.type === "photo"
        ? Math.round(width / (225 / 290)) // Maintain aspect ratio for photos
        : width;

    const bgImage = noteData.type === "photo"
        ? "modules/investigation-board/assets/photoFrame.webp"
        : "modules/investigation-board/assets/note_white.webp";

    // Update background sprite
    if (!this.bgSprite) {
        this.bgSprite = new PIXI.Sprite();
        this.addChild(this.bgSprite); // Add first (base layer)
    }
    try {
        this.bgSprite.texture = PIXI.Texture.from(bgImage);
    } catch (err) {
        console.error(`Failed to load background texture: ${bgImage}`, err);
        this.bgSprite.texture = PIXI.Texture.EMPTY; // Fallback in case of error
    }
    this.bgSprite.width = width;
    this.bgSprite.height = height;

    // Update foreground sprite (for photo notes)
    if (noteData.type === "photo") {
        const fgImage = noteData.image || "modules/investigation-board/assets/placeholder.webp";
        if (!this.fgSprite) {
            this.fgSprite = new PIXI.Sprite();
            this.addChild(this.fgSprite); // Add second (above background)
        }
        try {
            this.fgSprite.texture = PIXI.Texture.from(fgImage);
        } catch (err) {
            console.error(`Failed to load foreground texture: ${fgImage}`, err);
            this.fgSprite.texture = PIXI.Texture.EMPTY; // Fallback in case of error
        }

        const widthOffset = width * 0.13333;
        const heightOffset = height * 0.30246;

        this.fgSprite.width = width - widthOffset;
        this.fgSprite.height = height - heightOffset;
        this.fgSprite.position.set(widthOffset / 2, heightOffset / 2);
        this.fgSprite.visible = true;
    } else if (this.fgSprite) {
        this.fgSprite.visible = false;
    }

    // Configure the text
    const font = game.settings.get(MODULE_ID, "font");
    const baseFontSize = game.settings.get(MODULE_ID, "baseFontSize");
    const fontSize = (width / 200) * baseFontSize;

    const textStyle = new PIXI.TextStyle({
        fontFamily: font,
        fontSize: fontSize,
        fill: "#000000",
        wordWrap: true,
        wordWrapWidth: width - 15,
        align: "center",
    });

    const truncatedText = this._truncateText(noteData.text || "Default Text", font, noteData.type, fontSize);

    // Add or update the text
    if (!this.noteText) {
        this.noteText = new PIXI.Text(truncatedText, textStyle);
        this.noteText.anchor.set(0.5);
        this.addChild(this.noteText); // Add third (above photo but below pin)
    } else {
        this.noteText.style = textStyle;
        this.noteText.text = truncatedText;
    }

    // Position the text based on note type
    if (noteData.type === "photo") {
        this.noteText.position.set(width / 2, height - 25); // Near the bottom for photos
    } else {
        this.noteText.position.set(width / 2, height / 2); // Center for sticky notes
    }

    // Update pin sprite
    if (!this.pinSprite) {
        this.pinSprite = new PIXI.Sprite();
        this.addChild(this.pinSprite); // Add last (top layer)
    }
    let pinColor = noteData.pinColor;

    if (!pinColor) {
        const pinSetting = game.settings.get(MODULE_ID, "pinColor");
        pinColor = pinSetting === "random"
            ? PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]
            : `${pinSetting}Pin.webp`;

        // Save the assigned color in the note's flags
        await this.document.update({ [`flags.${MODULE_ID}.pinColor`]: pinColor });
    }

    const pinImage = `modules/investigation-board/assets/${pinColor}`;
    try {
        this.pinSprite.texture = PIXI.Texture.from(pinImage);
    } catch (err) {
        console.error(`Failed to load pin texture: ${pinImage}`, err);
        this.pinSprite.texture = PIXI.Texture.EMPTY; // Fallback in case of error
    }
    this.pinSprite.width = 40; // Adjust pin size
    this.pinSprite.height = 40;
    this.pinSprite.position.set(width / 2 - 20, 3); // Center pin at the top
  }

  _truncateText(text, font, noteType, currentFontSize) {
    const limits = getDynamicCharacterLimits(font, currentFontSize);
    const charLimit = limits[noteType] || 100;

    if (text.length <= charLimit) {
      return text;
    }
    return text.slice(0, charLimit).trim() + "...";
  }

  _customizeControls() {
    if (this.border) {
      const w = this.document.shape?.width || 200;
      const h = this.document.shape?.height || 200;
      this.border.clear();
      this.border.lineStyle(1, 0xFFFFFF, 0).drawRect(0, 0, w, h);
    }
    if (this.handle) {
      this.handle.visible = false;
    }
  }
}

// Function to create notes and switch to Drawing Canvas
async function createNote(noteType) {
  const scene = canvas.scene;
  if (!scene) {
    console.error("Cannot create note: No active scene.");
    return;
  }

  const stickyW = game.settings.get(MODULE_ID, "stickyNoteWidth") || 200;
  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth") || 225;

  const stickyText = game.settings.get(MODULE_ID, "stickyNoteDefaultText") || "Clue";
  const photoText = game.settings.get(MODULE_ID, "photoNoteDefaultText") || "Suspect/Place";

  const stickyAspect = 1;
  const photoAspect = 225 / 290;

  const width = noteType === "photo" ? photoW : stickyW;
  const height = noteType === "photo" ? Math.round(photoW / photoAspect) : Math.round(stickyW * stickyAspect);

  const dims = canvas.dimensions;
  const x = dims.width / 2;
  const y = dims.height / 2;

  const defaultText = noteType === "photo" ? photoText : stickyText;
  const defaultImage = "modules/investigation-board/assets/placeholder.webp";

  // Create the note as a drawing
  await canvas.scene.createEmbeddedDocuments("Drawing", [
    {
      type: "r",
      author: game.user.id,
      x,
      y,
      shape: { width, height },
      fillColor: "#ffffff",
      fillAlpha: 1,
      strokeColor: "transparent",
      strokeAlpha: 0,
      locked: false,
      flags: {
        [MODULE_ID]: {
          type: noteType,
          text: defaultText,
          image: noteType === "photo" ? defaultImage : null,
        },
      },
      "flags.core.sheetClass": "investigation-board.CustomDrawingSheet",
      "ownership": { default: 3 },
    },
  ]);

  // Switch to the Drawing layer
  canvas.drawings.activate();
}

async function createCharacterPhotoNote(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications.error("Actor not found!");
    return;
  }

  // Get the configured key path and resolve the name
  const nameKey = game.settings.get(MODULE_ID, "characterNameKey") || "name";
  const name = getNestedProperty(actor, nameKey, actor.name);

  const imgSrc = actor.img || "modules/investigation-board/assets/placeholder.webp";

  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth") || 225;
  const photoAspect = 225 / 290;
  const width = photoW;
  const height = Math.round(photoW / photoAspect);

  const dims = canvas.dimensions;
  const x = dims.sceneX + dims.sceneWidth / 2 - width / 2;
  const y = dims.sceneY + dims.sceneHeight / 2 - height / 2;
  const randomRotation = (Math.random() * 8 - 4) * (Math.PI / 180);

  // Create the photo note
  await canvas.scene.createEmbeddedDocuments("Drawing", [
    {
      type: "r",
      author: game.user.id,
      x,
      y,
      shape: { width, height },
      fillColor: "#ffffff",
      fillAlpha: 1,
      strokeColor: "transparent",
      strokeAlpha: 0,
      locked: false,
      rotation: randomRotation,
      flags: {
        [MODULE_ID]: {
          type: "photo",
          text: name,
          image: imgSrc,
        },
      },
      "flags.core.sheetClass": "investigation-board.CustomDrawingSheet",
      "ownership": { default: 3 },
    },
  ]);

  canvas.drawings.activate();
}

async function createScenePhotoNote(sceneId) {
  const scene = game.scenes.get(sceneId);
  if (!scene) {
    ui.notifications.error("Scene not found!");
    return;
  }

  // Extract required information
  const imgSrc = scene.background?.src || "modules/investigation-board/assets/placeholder.webp";
  const noteText = scene.navName || scene.name;

  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth") || 225;
  const photoAspect = 225 / 290;
  const width = photoW;
  const height = Math.round(photoW / photoAspect);

  const dims = canvas.dimensions;
  const x = dims.sceneX + dims.sceneWidth / 2 - width / 2;
  const y = dims.sceneY + dims.sceneHeight / 2 - height / 2;
  const randomRotation = (Math.random() * 8 - 4) * (Math.PI / 180);

  // Create the photo note
  await canvas.scene.createEmbeddedDocuments("Drawing", [
    {
      type: "r",
      author: game.user.id,
      x,
      y,
      shape: { width, height },
      fillColor: "#ffffff",
      fillAlpha: 1,
      strokeColor: "transparent",
      strokeAlpha: 0,
      locked: false,
      rotation: randomRotation,
      flags: {
        [MODULE_ID]: {
          type: "photo",
          text: noteText,
          image: imgSrc,
        },
      },
      "flags.core.sheetClass": "investigation-board.CustomDrawingSheet",
      "ownership": { default: 3 },
    },
  ]);

  canvas.drawings.activate();
}

// Register Custom Drawing Sheet
Hooks.once("init", () => {
  registerSettings(); // Register the module settings first

  DocumentSheetConfig.registerSheet(DrawingDocument, "investigation-board", CustomDrawingSheet, {
    label: "Note Drawing Sheet",
    types: ["base"],
    makeDefault: false,
  });
});

// Extend Drawing Class
Hooks.once("canvasInit", () => {
  CONFIG.Drawing.objectClass = CustomDrawing;
  console.log("CustomDrawing renderer extended.");
});

// Force re-draw on update to ensure all clients see changes without dragging
Hooks.on("updateDrawing", (doc, changes, options, userId) => {
  const drawing = canvas.drawings.get(doc.id);
  if (drawing) drawing.refresh();
});

Hooks.on("getSceneDirectoryEntryContext", (html, options) => {
  options.push({
    name: "Create Scene Photo Note",
    icon: '<i class="fa-solid fa-camera-polaroid"></i>',
    condition: (li) => game.user.isGM, // Restrict to GMs
    callback: async (li) => {
      const sceneId = li.data("documentId"); // Correct way to fetch the scene ID
      const scene = game.scenes.get(sceneId); // Fetch the scene from game.scenes
      if (!scene) {
        ui.notifications.error("Scene not found!");
        return;
      }
      await createScenePhotoNote(sceneId); // Use the corrected sceneId
    },
  });
});

Hooks.on("getActorDirectoryEntryContext", (html, options) => {
  options.push({
    name: "Create Character Photo Note",
    icon: '<i class="fa-solid fa-camera-polaroid"></i>',
    condition: (li) => game.user.isGM, // Restrict to GMs
    callback: async (li) => {
      const actorId = li.data("documentId");
      await createCharacterPhotoNote(actorId);
    },
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  // Find the Journal Notes controls group
  const journalControls = controls.find((c) => c.name === "notes");

  if (!journalControls) {
    console.error("Journal Notes Controls not found!");
    return;
  }

  // Add Investigation Board buttons to the Journal Notes controls
  journalControls.tools.push(
    {
      name: "createStickyNote",
      title: "Create Sticky Note",
      icon: "fas fa-sticky-note",
      visible: true,
      onClick: () => createNote("sticky"),
      button: true,
    },
    {
      name: "createPhotoNote",
      title: "Create Photo Note",
      icon: "fa-solid fa-camera-polaroid",
      visible: true,
      onClick: () => createNote("photo"),
      button: true,
    }
  );
});

window.createStickyNote = async () => await createNote("sticky");
window.createPhotoNote = async () => await createNote("photo");

export { CustomDrawing, CustomDrawingSheet };

