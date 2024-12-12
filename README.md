# Investigation Board

A Foundry VTT module that lets everyone create, edit, and move sticky and photo notes on the scene.

## How to Use

![image](https://github.com/user-attachments/assets/c922e8d5-b168-4155-a5e3-229c06a54aa0)

Open the Journal Notes Toolbar:

On the left sidebar of the scene, select the Journal Notes tools.
You’ll see two new buttons:
Create Sticky Note (a sticky note icon)
Create Photo Note (a Polaroid camera icon)

### Create and Edit a Note

Click Create Sticky Note/Photo Note to place one of them in the middle of the scene.

The scene will automatically go to __drawing mode__, and you can change the note content with a DOUBLE CLICK.


__Edit and drag__ the note around is only possible in **drawing mode** ![image](https://github.com/user-attachments/assets/4b6ecb10-2ab4-4328-82fb-939bbcca1f91)
, since in the end, they are a drawing. 

#### **Note** (pun intended): Only the GM can assign an image to the photo notes unless she/he/they give you browser file permissions.

There are some pretty straightforward options in the settings for the module so you can better adjust it for your table


## Installation

To install this module, in Foundry VTT go to the Add-on Modules tab:

Search in the top bar for "investigation board" and click Install

OR

Click Install Module

Paste the following manifest URL into the bottom Manifest URL field: https://raw.githubusercontent.com/mordachai/investigation-board/main/module.json

After that go to your world and enable the module in your Game Settings under Manage Modules

## Known Limitations

- **Refresh on Update:** The module includes a hook to ensure notes are redrawn when updated by others. However, if something seems out of date, try selecting/deselecting notes or refreshing the page.
