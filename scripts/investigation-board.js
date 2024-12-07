import { registerSettings } from "./settings.js";

const MODULE_ID = "investigation-board"; // Replace with your actual module name

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
    data.noteType = this.object.flags["investigation-board"]?.type || "sticky";
    data.text = this.object.flags["investigation-board"]?.text || "Default Text";
    data.image = this.object.flags["investigation-board"]?.image || "modules/investigation-board/assets/placeholder.webp";
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // File picker for the image input
    html.find(".file-picker-button").click((event) => {
      new FilePicker({
        type: "image",
        current: this.object.flags["investigation-board"]?.image || "",
        callback: (path) => {
          html.find("input[name='image']").val(path);
        },
      }).render(true);
    });

    // Save button handler
    html.find(".save-button").click((event) => {
      event.preventDefault();
      this._onSubmit(event);
    });
  }

  async _updateObject(event, formData) {
    const updates = {
      "flags.investigation-board.type": formData.noteType,
      "flags.investigation-board.text": formData.text,
      "flags.investigation-board.image": formData.image || "icons/svg/mystery-man.svg",
    };

    await this.object.update(updates);

    // Refresh the drawing on the canvas
    const drawing = canvas.drawings.get(this.object.id);
    if (drawing) {
      drawing.refresh();
    }
  }
}

class CustomDrawing extends Drawing {
  constructor(...args) {
    super(...args);
    this.bgSprite = null; // Background (sticky note or photo frame)
    this.fgSprite = null; // Foreground (photo image)
    this.noteText = null; // Text overlay
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
    const noteData = this.document.flags["investigation-board"];
    if (!noteData) return;

    // Get configured dimensions
    const stickyW = game.settings.get(MODULE_ID, "stickyNoteWidth");
    const stickyH = game.settings.get(MODULE_ID, "stickyNoteHeight");
    const photoW = game.settings.get(MODULE_ID, "photoNoteWidth");
    const photoH = game.settings.get(MODULE_ID, "photoNoteHeight");

    // Determine dimensions based on note type
    let { width, height } = this.document.shape;
    if (!width || !height) {
      // If not set, use configured defaults
      if (noteData.type === "photo") {
        width = photoW;
        height = photoH;
      } else {
        width = stickyW;
        height = stickyH;
      }
    }

    // Select background image
    const bgImage = noteData.type === "photo"
      ? "modules/investigation-board/assets/photoFrame.webp"
      : "modules/investigation-board/assets/note_white.webp";

    // Create or update background sprite
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
    this.bgSprite.visible = true;
    this.bgSprite.width = width;
    this.bgSprite.height = height;

    // Foreground image (only for photo notes)
    if (noteData.type === "photo") {
      const fgImage = noteData.image || "modules/investigation-board/assets/placeholder.webp";
      if (!this.fgSprite) {
        this.fgSprite = new PIXI.Sprite();
        this.addChild(this.fgSprite);
      }
      try {
        this.fgSprite.texture = PIXI.Texture.from(fgImage);
      } catch (err) {
        console.error(`Failed to load foreground texture: ${fgImage}`, err);
        this.fgSprite.texture = PIXI.Texture.EMPTY;
      }

      this.fgSprite.visible = true;
      // Adjust the photo's dimensions relative to the chosen sizes
      // Keeping the same ratio as before, but scaling accordingly
      // Originally: width - 50 and height - 113 (for 250x310)
      // Scale these offsets proportionally based on ratio:
      // Ratio for width offset: 50 / 250 = 0.2 of width
      // Ratio for height offset: 113 / 310 ≈ 0.3645 of height
      const widthOffset = width * 0.13333;
      const heightOffset = height * 0.30246;

      this.fgSprite.width = width - widthOffset;
      this.fgSprite.height = height - heightOffset;
      this.fgSprite.position.set(widthOffset / 2, heightOffset / 2); // Center it inside the frame proportionally
    } else if (this.fgSprite) {
      // Hide if not a photo note
      this.fgSprite.visible = false;
    }

    // Text style and positioning
    const textStyle = new PIXI.TextStyle({
      fontFamily: "Rock Salt",
      fontSize: 18,
      fill: "#000000",
      wordWrap: true,
      wordWrapWidth: width - 20,
      align: "center",
    });

    if (!this.noteText) {
      this.noteText = new PIXI.Text(noteData.text || "Default Text", textStyle);
      this.noteText.anchor.set(0.5);
      this.addChild(this.noteText);
    } else {
      this.noteText.style = textStyle;
      this.noteText.text = noteData.text || "Default Text";
    }

    // Adjust text position based on note type
    if (noteData.type === "photo") {
      this.noteText.position.set(width / 2, height - 25);
    } else {
      this.noteText.position.set(width / 2, height / 2);
    }
  }

  _customizeControls() {
    // Remove or minimize the visible selection outline
    if (this.border) {
      const w = this.document.shape?.width || 200;
      const h = this.document.shape?.height || 200;
      this.border.clear();
      // Draw a transparent border (effectively invisible)
      this.border.lineStyle(1, 0xFFFFFF, 0).drawRect(0, 0, w, h);
    }

    // Hide the resize handle
    if (this.handle) {
      this.handle.visible = false;
    }
  }
}


// Function to Create Notes as Drawings
async function createNote(noteType) {
  const scene = canvas.scene;
  if (!scene) {
    console.error("Cannot create note: No active scene.");
    return;
  }

  const stickyW = game.settings.get(MODULE_ID, "stickyNoteWidth");
  const stickyH = game.settings.get(MODULE_ID, "stickyNoteHeight");
  const photoW = game.settings.get(MODULE_ID, "photoNoteWidth");
  const photoH = game.settings.get(MODULE_ID, "photoNoteHeight");

  const dims = canvas.dimensions;
  const x = dims.width / 2;
  const y = dims.height / 2;
  const width = noteType === "photo" ? photoW : stickyW;
  const height = noteType === "photo" ? photoH : stickyH;

  await canvas.scene.createEmbeddedDocuments("Drawing", [
    {
      type: "r",
      author: game.user.id,
      x,
      y,
      shape: { width, height },
      fillColor: "#ffffff", 
      fillAlpha: 1,
      strokeColor: "#00000000",
      strokeAlpha: 0,
      locked: false,
      flags: {
        "investigation-board": {
          type: noteType,
          text: noteType === "sticky" ? "Clue" : "Suspect/Place",
          image: noteType === "photo" ? null : null,
        },
      },
      "flags.core.sheetClass": "investigation-board.CustomDrawingSheet",
      "ownership": { "default": 3 }
    },
  ]);

  console.log(`Created ${noteType} note at (${x}, ${y}) with dimensions (${width}, ${height})`);
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

Hooks.on("getSceneControlButtons", (controls) => {
  const drawingsControl = controls.find(c => c.name === "drawings");
  if (!drawingsControl) return;

  drawingsControl.tools.push({
    name: "createStickyNote",
    title: "Create Sticky Note",
    icon: "fas fa-sticky-note",
    visible: true,
    onClick: () => {
      createNote("sticky");
    },
    button: true
  });

  drawingsControl.tools.push({
    name: "createPhotoNote",
    title: "Create Photo Note",
    icon: "fa-solid fa-camera-polaroid",
    visible: true,
    onClick: () => {
      createNote("photo");
    },
    button: true
  });
});

window.createStickyNote = async () => await createNote("sticky");
window.createPhotoNote = async () => await createNote("photo");

// Force re-draw on update to ensure all clients see changes without dragging
Hooks.on("updateDrawing", (doc, changes, options, userId) => {
  const drawing = canvas.drawings.get(doc.id);
  if (drawing) drawing.refresh();
});
