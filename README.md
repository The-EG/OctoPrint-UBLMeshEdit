# OctoPrint-UBLMeshEdit

![screenshot](assets/img/screenshot.png)

UBL Mesh Editor can be used to view, edit and manage Marlin Unified Bed Leveling (UBL) meshes. 

In its current state, this plugin is intended to be used to make minor tweaks to a mesh that is already valid and setup. This could be to correct a point that wasn't probed properly for some reason or to fine tune the mesh when using `PROBE_MANUALLY`. It won't help with the initial creation of a mesh, except in the case of starting with a zero mesh and manually editing points.

*Note: this is only intended for UBL, and not any other ABL or MBL setup. It assumes a square mesh and will not function properly with other shapes.*

## Setup

Install via the bundled [Plugin Manager](https://docs.octoprint.org/en/master/bundledplugins/pluginmanager.html)
or manually using this URL:

    https://github.com/The-EG/OctoPrint-UBLMeshEdit/archive/main.zip

## Usage

With the printer connected and idle, switch to the 'UBL Mesh Editor' tab and click 'Get Mesh'. The current mesh will be shown.

Click a point to edit the value. The current value will be shown next to 'Z Value.' That value can be changed by clicking up/down or by entering a value. To save the value, click 'Save Value.'

UBL Mesh Editor can also save and load saved meshes. Select the mesh slot next to 'Mesh Save Slot' and click either 'Save' or 'Load.'

*Note: the plugin does not currently verify the save mesh slot is valid.*

## Todo

 - [ ] Add 'move nozzle to point' functionality
 - [ ] Add more general error checking and disable buttons when appropriate
 - [x] Add export/import mesh to/from csv (implemented export to GCode)
 - [ ] Handle invalid meshes?