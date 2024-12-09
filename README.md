# Investigation Board

A Foundry VTT module that lets everyone create, edit, and move sticky and photo notes on the scene.

## How to Use

![image](https://github.com/user-attachments/assets/4bf03b99-27d0-4f9a-aaf8-aa86cf4733eb)

Open the Drawings Toolbar:

On the left sidebar of the scene, select the Drawings layer tool.
You’ll see two new buttons:
Create Sticky Note (a sticky note icon)
Create Photo Note (a camera icon)

### Create a New Note

Click Create Sticky Note to place a sticky note on the scene.
Click Create Photo Note to place a photo note on the scene.
Notes appear in the center of the scene. You can then drag them to your desired location.

### Editing a Note

Double-click a note to open its configuration sheet.
For a sticky note, you’ll see options to change the note’s text.
For a photo note, you can also specify an image path via a file picker.
Click Save to apply changes. The note will update on all connected clients.

## Known Limitations

- **Concurrent Edits:** While all owners can edit notes, Foundry VTT doesn’t support complex concurrent merging. If two users edit the same note simultaneously, the last saved version will overwrite the other’s changes.

- **Refresh on Update:** The module includes a hook to ensure notes redraw when updated by others. However, if something seems out of date, try selecting/deselecting notes or refreshing the page.
