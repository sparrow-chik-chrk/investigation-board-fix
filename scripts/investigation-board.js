import { registerSettings } from "./settings.js";

const MODULE_ID = "investigation-board";
const BASE_FONT_SIZE = 16;
const PIN_COLORS = ["redPin.webp", "bluePin.webp", "yellowPin.webp", "greenPin.webp"];

function getBaseCharacterLimits() {
  return game.settings.get(MODULE_ID, "baseCharacterLimits") || {
    sticky: 60,
    photo: 15,
    index: 200,
  };
}

function getDynamicCharacterLimits(noteType, currentFontSize) {
  const baseLimits = getBaseCharacterLimits();
  const scaleFactor = BASE_FONT_SIZE / currentFontSize;
  const limits = baseLimits[noteType] || { sticky: 60, photo: 15, index: 200 };
  return {
    sticky: Math.round(limits.sticky * scaleFactor),
    photo: Math.round(limits.photo * scaleFactor),
    index: Math.round(limits.index * scaleFactor),
  };
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
    data.noteTypes = {
      sticky: "Sticky Note",
      photo: "Photo Note",
      index: "Index Card",
    };
    return data;
  }

  async _updateObject(event, formData) {
    const updates = {
      [`flags.${MODULE_ID}.type`]: formData.noteType,
      [`flags.${MODULE_ID}.text`]: formData.text,
      [`flags.${MODULE_ID}.image`]: formData.image || "modules/investigation-board/assets/placeholder.webp",
    };

    await this.object.update(updates);
    const drawing = canvas.drawings.get(this.object.id);
    if (drawing) drawing.refresh();
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

    const isPhoto = noteData.type === "photo";
    const isIndex = noteData.type === "index";

    const width = isPhoto
      ? game.settings.get(MODULE_ID, "photoNoteWidth")
      : isIndex
        ? game.settings.get(MODULE_ID, "indexNoteWidth") || 600  // Index Card width&#8203;:contentReference[oaicite:1]{index=1}
        : game.settings.get(MODULE_ID, "stickyNoteWidth");

    const height = isPhoto
      ? Math.round(width / (225 / 290))
      : isIndex
        ? Math.round(width / (600 / 400))  // Index Card aspect ratio&#8203;:contentReference[oaicite:2]{index=2}
        : width;

    const bgImage = isPhoto
      ? "modules/investigation-board/assets/photoFrame.webp"
      : isIndex
        ? "modules/investigation-board/assets/note_index.webp"  // New asset
        : "modules/investigation-board/assets/note_white.webp";

    if (!this.bgSprite) {
      this.bgSprite = new PIXI.Sprite();
      this.addChild(this.bgSprite);
    }

    try {
      this.bgSprite.texture = PIXI.Texture.from(bgImage);
    } catch (err) {
      console.error(`Failed to load background texture: ${bgImage}`, err);
      this.bgSprite.texture = PIXI.Texture.EMPTY;
    }

    this.bgSprite.width = width;
    this.bgSprite.height = height;

    const font = game.settings.get(MODULE_ID, "font");
    const baseFontSize = game.settings.get(MODULE_ID, "baseFontSize");
    const fontSize = (width / 200) * baseFontSize;

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
  this.pinSprite.texture = PIXI.Texture.EMPTY;
}
this.pinSprite.width = 40; // Adjust pin size if needed
this.pinSprite.height = 40;
this.pinSprite.position.set(width / 2 - 20, 3); // Center pin at the top


    const textStyle = new PIXI.TextStyle({
      fontFamily: font,
      fontSize: fontSize,
      fill: "#000000",
      wordWrap: true,
      wordWrapWidth: width - 15,
      align: "center",
    });

    const truncatedText = this._truncateText(noteData.text || "Default Text", font, noteData.type, fontSize);

    if (!this.noteText) {
      this.noteText = new PIXI.Text(truncatedText, textStyle);
      this.noteText.anchor.set(0.5);
      this.addChild(this.noteText);
    } else {
      this.noteText.style = textStyle;
      this.noteText.text = truncatedText;
    }

    this.noteText.position.set(width / 2, isPhoto ? height - 25 : height / 2);
  }

  _truncateText(text, font, noteType, currentFontSize) {
    const limits = getDynamicCharacterLimits(font, currentFontSize);
    const charLimit = limits[noteType] || 100;
    return text.length <= charLimit ? text : text.slice(0, charLimit).trim() + "...";
  }
}

async function createNote(noteType) {
  const scene = canvas.scene;
  if (!scene) {
    console.error("Cannot create note: No active scene.");
    return;
  }

  // Ensure settings exist, or use defaults
  const stickyW = game.settings.get(MODULE_ID, "stickyNoteWidth") || 200;
  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth") || 225;
  const indexW = game.settings.get(MODULE_ID, "indexNoteWidth") || 600;

  const width = noteType === "photo" ? photoW : noteType === "index" ? indexW : stickyW;
  const height = noteType === "photo" ? Math.round(photoW / (225 / 290)) : 
                 noteType === "index" ? Math.round(indexW / (600 / 400)) : 
                 stickyW;

  const dims = canvas.dimensions;
  const x = dims.width / 2;
  const y = dims.height / 2;

  // Get default text from settings (use fallback if missing)
  const defaultText = game.settings.get(MODULE_ID, `${noteType}NoteDefaultText`) || "Notes";

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
        },
      },
      "flags.core.sheetClass": "investigation-board.CustomDrawingSheet",
      "ownership": { default: 3 },
    },
  ]);

  canvas.drawings.activate();
}


Hooks.on("getSceneControlButtons", (controls) => {
  const journalControls = controls.find((c) => c.name === "notes");
  if (!journalControls) return;

  journalControls.tools.push(
    { name: "createStickyNote", title: "Create Sticky Note", icon: "fas fa-sticky-note", onClick: () => createNote("sticky"), button: true },
    { name: "createPhotoNote", title: "Create Photo Note", icon: "fa-solid fa-camera-polaroid", onClick: () => createNote("photo"), button: true },
    { name: "createIndexCard", title: "Create Index Card", icon: "fa-regular fa-subtitles", onClick: () => createNote("index"), button: true }
  );
});

Hooks.once("init", () => {
  registerSettings();
  CONFIG.Drawing.objectClass = CustomDrawing;

  DocumentSheetConfig.registerSheet(DrawingDocument, "investigation-board", CustomDrawingSheet, {
    label: "Note Drawing Sheet",
    types: ["base"],
    makeDefault: false,
  });

  console.log("Investigation Board module initialized.");
});


export { CustomDrawing, CustomDrawingSheet };
