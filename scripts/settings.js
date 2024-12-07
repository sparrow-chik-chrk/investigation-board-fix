// settings.js

export const registerSettings = function() {
    const MODULE_ID = "investigation-board"; // Replace with your actual module name
    
    game.settings.register(MODULE_ID, "stickyNoteWidth", {
      name: "Sticky Note Width",
      hint: "The width (in pixels) for all newly created sticky notes (default: 200).",
      scope: "world",
      config: true,
      type: Number,
      default: 200,  // Default width for sticky notes
      onChange: value => {
        // If needed, refresh drawings or do something after changing this setting
      }
    });
  
    game.settings.register(MODULE_ID, "stickyNoteHeight", {
      name: "Sticky Note Height",
      hint: "The height (in pixels) for all newly created sticky notes (default: 200).",
      scope: "world",
      config: true,
      type: Number,
      default: 200,  // Default height for sticky notes
      onChange: value => {
        // If needed, refresh drawings or do something after changing this setting
      }
    });
  
    game.settings.register(MODULE_ID, "photoNoteWidth", {
      name: "Photo Note Width",
      hint: "The width (in pixels) for all newly created photo notes (default: 225). ",
      scope: "world",
      config: true,
      type: Number,
      default: 225,  // Default width for photo notes
      onChange: value => {
        // If needed, refresh drawings or do something after changing this setting
      }
    });
  
    game.settings.register(MODULE_ID, "photoNoteHeight", {
      name: "Photo Note Height",
      hint: "The height (in pixels) for all newly created photo notes (default:290).",
      scope: "world",
      config: true,
      type: Number,
      default: 290,  // Default height for photo notes
      onChange: value => {
        // If needed, refresh drawings or do something after changing this setting
      }
    });
  };
  