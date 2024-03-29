- 0.3.0 - 2021-04-10
  - Add option to display mesh row and column headers
  - Add option to display circular bed extent
  - Add initial handling of invalid mesh points
- 0.2.2 - 2021-03-05
  - Fix detection for ABL with mesh subdivision (Snapmaker) (#5)
  - Add an note when no mesh is detected, directing user to open issue
- 0.2.1 - 2021-02-28
  - New Features:
    - Basic ABL compatibility: this plugin will now attempt to show and allow point editing of ABL meshes, however a warning will be displayed and most other features will be disabled. This warning can be hidden in the plugin settings.
    - Added an 'Export GCode' button. This button will export (download) a gcode file with the current mesh values. This gcode file can be loaded back into OctoPrint and 'printed' to restore the mesh values. This can be used to back up meshes, or transfer them between printers. This requires the meshes to have the same grid size.
- 0.1.2 - 2021-02-27
  - Fix an issue that would cause some buttons to be stuck in disabled or enabled state until the browser page was refreshed.
- 0.1.1 - 2021-02-25
  - Fixed an issue where firmware that output spaces instead of tabs and additional info after 'ok' would cause the mesh to not load. (#4)
- 0.1.0 - 2021-02-24
  - Initial Release
