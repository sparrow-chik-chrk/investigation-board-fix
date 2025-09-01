//investigation-boards.js

import { registerSettings } from "./settings.js";

const MODULE_ID = "investigation-board";
const BASE_FONT_SIZE = 15;
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
    
    // Pass along the extra identityName for futuristic photo notes
    data.identityName = this.object.flags[MODULE_ID]?.identityName || "";
    
    // Include the board mode from settings for conditional display in the template
    data.boardMode = game.settings.get(MODULE_ID, "boardMode");
    
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
    if (formData.identityName !== undefined) {
      updates[`flags.${MODULE_ID}.identityName`] = formData.identityName;
    }
    

    await this.object.update(updates);
    const drawing = canvas.drawings.get(this.object.id);
    if (drawing) drawing.refresh();
  }

  // Add activateListeners to hook up the file-picker button.
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".file-picker-button").click(ev => {
      ev.preventDefault();
      // Open Foundry's FilePicker for images; adjust the "current" directory if needed.
      new FilePicker({
        type: "image",
        current: "modules/investigation-board/assets/",
        callback: path => {
          // Update the readonly input with the chosen image path.
          html.find("input[name='image']").val(path);
        }
      }).browse();
    });
  }


}

class CustomDrawing extends Drawing {
  constructor(...args) {
    super(...args);
    this.bgSprite = null;
    this.pinSprite = null;
    this.noteText = null;
    this.photoImageSprite = null;
    this.identityNameText = null;
    this.futuristicText = null;
  }

  // Ensure sprites are created when the drawing is first rendered.
  async draw() {
    await super.draw();
    await this._updateSprites();
    return this;
  }

  // Ensure sprites update correctly on refresh.
  async refresh() {
    await super.refresh();
    await this._updateSprites();
    return this;
  }

  async _updateSprites() {
    const noteData = this.document.flags[MODULE_ID];
    if (!noteData) return;
    
    const isPhoto = noteData.type === "photo";
    const isIndex = noteData.type === "index";
    const mode = game.settings.get(MODULE_ID, "boardMode");
    
    // FUTURISTIC PHOTO NOTE LAYOUT
    if (isPhoto && mode === "futuristic") {
      const fullWidth = game.settings.get(MODULE_ID, "photoNoteWidth");
      const margin = 10;
      const photoImgWidth = fullWidth * 0.4;
      const photoImgHeight = photoImgWidth * (4 / 3);
      const textAreaX = margin + photoImgWidth + margin;
      const fullHeight = photoImgHeight + margin * 2;
    
      // --- Background Frame ---
      if (!this.bgSprite) {
        this.bgSprite = new PIXI.Sprite();
        this.addChildAt(this.bgSprite, 0);
      }
      try {
        // Always use the fixed photo frame image.
        this.bgSprite.texture = PIXI.Texture.from("modules/investigation-board/assets/photoFrame.webp");
      } catch (err) {
        console.error("Failed to load photo frame texture", err);
        this.bgSprite.texture = PIXI.Texture.EMPTY;
      }
      this.bgSprite.width = fullWidth;
      this.bgSprite.height = fullHeight;
    
      // --- Foreground (User-Assigned) Photo ---
      if (!this.photoImageSprite) {
        this.photoImageSprite = new PIXI.Sprite();
        this.addChild(this.photoImageSprite);
      }
      try {
        // Use a fallback if no image is assigned.
        const imagePath = noteData.image || "modules/investigation-board/assets/placeholder.webp";
        this.photoImageSprite.texture = PIXI.Texture.from(imagePath);
      } catch (err) {
        console.error(`Failed to load user photo: ${noteData.image}`, err);
        this.photoImageSprite.texture = PIXI.Texture.EMPTY;
      }
      // Position the user photo inside the frame.
      this.photoImageSprite.width = fullWidth * 0.9;
      this.photoImageSprite.height = fullHeight * 0.9;
      this.photoImageSprite.position.set(fullWidth * 0.05, fullHeight * 0.05);
    
      // --- Identity Name and Additional Text (Futuristic) ---
      const font = game.settings.get(MODULE_ID, "font");
      const baseFontSize = game.settings.get(MODULE_ID, "baseFontSize");
      const fontSize = (fullWidth / 200) * baseFontSize;
      const textStyle = new PIXI.TextStyle({
        fontFamily: font,
        fontSize: fontSize,
        fill: "#000000",
        wordWrap: true,
        wordWrapWidth: fullWidth - textAreaX - margin,
        align: "left",
      });
      if (!this.identityNameText) {
        this.identityNameText = new PIXI.Text("", textStyle);
        this.addChild(this.identityNameText);
      }
      this.identityNameText.text = noteData.identityName || "Name";
      this.identityNameText.style = textStyle;
      this.identityNameText.position.set(textAreaX, margin);
    
      if (!this.futuristicText) {
        this.futuristicText = new PIXI.Text("", textStyle);
        this.addChild(this.futuristicText);
      }
      this.futuristicText.text = noteData.text || "";
      this.futuristicText.style = textStyle;
      this.futuristicText.position.set(textAreaX, margin + this.identityNameText.height + 5);
    
      // Remove default note text if present.
      if (this.noteText) {
        this.removeChild(this.noteText);
        this.noteText.destroy();
        this.noteText = null;
      }
    
      // --- Pin Handling (Futuristic) ---
      const pinSetting = game.settings.get(MODULE_ID, "pinColor");
      if (pinSetting === "none") {
        if (this.pinSprite) {
          this.removeChild(this.pinSprite);
          this.pinSprite.destroy();
          this.pinSprite = null;
        }
      } else {
        if (!this.pinSprite) {
          this.pinSprite = new PIXI.Sprite();
          this.addChild(this.pinSprite);
        }
        let pinColor = noteData.pinColor;
        if (!pinColor) {
          pinColor = (pinSetting === "random")
            ? PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]
            : `${pinSetting}Pin.webp`;
          if (this.document.isOwner) {
            await this.document.update({ [`flags.${MODULE_ID}.pinColor`]: pinColor });
          }
        }
        const pinImage = `modules/investigation-board/assets/${pinColor}`;
        try {
          this.pinSprite.texture = PIXI.Texture.from(pinImage);
        } catch (err) {
          console.error(`Failed to load pin texture: ${pinImage}`, err);
          this.pinSprite.texture = PIXI.Texture.EMPTY;
        }
        this.pinSprite.width = 40;
        this.pinSprite.height = 40;
        this.pinSprite.position.set(fullWidth / 2 - 20, 3);
      }
      return; // End early for futuristic photo notes.
    }
    
    // STANDARD LAYOUT (Modern photo notes, sticky, index, etc.)
    const width = isPhoto
      ? game.settings.get(MODULE_ID, "photoNoteWidth")
      : isIndex
        ? game.settings.get(MODULE_ID, "indexNoteWidth") || 600
        : game.settings.get(MODULE_ID, "stickyNoteWidth");
    
    const height = isPhoto
      ? Math.round(width / (225 / 290))
      : isIndex
        ? Math.round(width / (600 / 400))
        : width;
    
    // Background Image based on board mode.
    const getBackgroundImage = (noteType, mode) => {
      if (mode === "futuristic") {
        if (noteType === "photo") return "modules/investigation-board/assets/futuristic_photoFrame.webp";
        if (noteType === "index") return "modules/investigation-board/assets/futuristic_note_index.webp";
        return "modules/investigation-board/assets/futuristic_note_white.webp";
      } else if (mode === "custom") {
        if (noteType === "photo") return "modules/investigation-board/assets/custom_photoFrame.webp";
        if (noteType === "index") return "modules/investigation-board/assets/custom_note_index.webp";
        return "modules/investigation-board/assets/custom_note_white.webp";
      }
      // Default "modern" mode:
      if (noteType === "photo") return "modules/investigation-board/assets/photoFrame.webp";
      if (noteType === "index") return "modules/investigation-board/assets/note_index.webp";
      return "modules/investigation-board/assets/note_white.webp";
    };
    const bgImage = getBackgroundImage(noteData.type, mode);
    
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
    
    // --- Foreground (User-Assigned) Photo for Modern Mode ---
    // (This is the code missing from your current version.)
    if (isPhoto) {
      const fgImage = noteData.image || "modules/investigation-board/assets/placeholder.webp";
      if (!this.photoImageSprite) {
        this.photoImageSprite = new PIXI.Sprite();
        this.addChild(this.photoImageSprite);
      }
      try {
        this.photoImageSprite.texture = PIXI.Texture.from(fgImage);
      } catch (err) {
        console.error(`Failed to load foreground texture: ${fgImage}`, err);
        this.photoImageSprite.texture = PIXI.Texture.EMPTY;
      }
      // Use offsets similar to your old code.
      const widthOffset = width * 0.13333;
      const heightOffset = height * 0.30246;
      this.photoImageSprite.width = width - widthOffset;
      this.photoImageSprite.height = height - heightOffset;
      this.photoImageSprite.position.set(widthOffset / 2, heightOffset / 2);
      this.photoImageSprite.visible = true;
    } else if (this.photoImageSprite) {
      this.photoImageSprite.visible = false;
    }
    
    // --- Pin Handling (Standard) ---
    {
      const pinSetting = game.settings.get(MODULE_ID, "pinColor");
      if (pinSetting === "none") {
        if (this.pinSprite) {
          this.removeChild(this.pinSprite);
          this.pinSprite.destroy();
          this.pinSprite = null;
        }
      } else {
        if (!this.pinSprite) {
          this.pinSprite = new PIXI.Sprite();
          this.addChild(this.pinSprite);
        }
        let pinColor = noteData.pinColor;
        if (!pinColor) {
          pinColor = (pinSetting === "random")
            ? PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]
            : `${pinSetting}Pin.webp`;
	  if (this.document.isOwner) {
            await this.document.update({ [`flags.${MODULE_ID}.pinColor`]: pinColor });
          }
        }
        const pinImage = `modules/investigation-board/assets/${pinColor}`;
        try {
          this.pinSprite.texture = PIXI.Texture.from(pinImage);
        } catch (err) {
          console.error(`Failed to load pin texture: ${pinImage}`, err);
          this.pinSprite.texture = PIXI.Texture.EMPTY;
        }
        this.pinSprite.width = 40;
        this.pinSprite.height = 40;
        this.pinSprite.position.set(width / 2 - 20, 3);
      }
    }
    
    // Default text layout for non-futuristic notes.
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

  // Retrieve width settings (or use defaults)
  const stickyW = game.settings.get(MODULE_ID, "stickyNoteWidth") || 200;
  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth") || 225;
  const indexW = game.settings.get(MODULE_ID, "indexNoteWidth") || 600;

  const width = noteType === "photo" ? photoW 
                : noteType === "index" ? indexW 
                : stickyW;
  const height = noteType === "photo" ? Math.round(photoW / (225 / 290)) 
                 : noteType === "index" ? Math.round(indexW / (600 / 400)) 
                 : stickyW;

  const dims = canvas.dimensions;
  const x = dims.width / 2;
  const y = dims.height / 2;

  // Get default text from settings (fallback if missing)
  const defaultText = game.settings.get(MODULE_ID, `${noteType}NoteDefaultText`) || "Notes";

  // Determine board mode and include identityName if note is a futuristic photo note
  const boardMode = game.settings.get(MODULE_ID, "boardMode");
  const extraFlags = {};
  if (noteType === "photo" && boardMode === "futuristic") {
    extraFlags.identityName = "";
  }

  await canvas.scene.createEmbeddedDocuments("Drawing", [
    {
      type: "r",
      author: game.user.id,
      x,
      y,
      shape: { width, height },
      fillColor: "#ffffff",
      fillAlpha: 1,
      strokeColor: "#000000",
      strokeAlpha: 0,
      locked: false,
      flags: {
        core: { sheetClass: "investigation-board.CustomDrawingSheet" },
        [MODULE_ID]: {
          type: noteType,
          text: defaultText,
          ...extraFlags
        },
      },
      "ownership": { default: 3 },
    },
  ]);

  canvas.drawings.activate();
}



Hooks.on("getSceneControlButtons", (controlsArg) => {
  // v12 => масив; v13 => Record<string, SceneControl>
  const isV13 = !Array.isArray(controlsArg);
  const list = isV13 ? Object.values(controlsArg ?? {}) : controlsArg;

  const target = list.find(c => c?.name === "drawings")
              ?? list.find(c => c?.name === "notes");
  if (!target) return;

  const addTool = (key, tool) => {
    if (Array.isArray(target.tools)) {
      // v12
      target.tools.push(tool);
    } else if (target.tools && typeof target.tools === "object") {
      // v13
      const arr = Object.values(target.tools);
      const nextOrder = (arr.length ? Math.max(...arr.map(t => t.order ?? 0)) : 0) + 1;
      target.tools[key] = { order: nextOrder, ...tool };
    } else {
      // страховка
      target.tools = { [key]: { order: 1, ...tool } };
    }
  };

  const mk = (name, title, icon, onClick) =>
    ({ name, title, icon, button: true, onClick }); // onClick у v13 ще підтримується (депрек.), працює. :contentReference[oaicite:2]{index=2}

  addTool("createStickyNote", mk("createStickyNote", "Create Sticky Note", "fas fa-sticky-note", () => createNote("sticky")));
  addTool("createPhotoNote",  mk("createPhotoNote",  "Create Photo Note",  "fas fa-camera",       () => createNote("photo")));
  addTool("createIndexCard",  mk("createIndexCard",  "Create Index Card",  "fas fa-align-left",   () => createNote("index")));
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
