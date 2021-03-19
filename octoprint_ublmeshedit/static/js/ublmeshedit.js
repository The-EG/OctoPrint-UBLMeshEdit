/*
 * View model for OctoPrint-UBLMeshEdit
 *
 * Author: Taylor Talkington
 * License: AGPLv3
 */
var interactiveWarning = "Warning!\nInteractive mode will send movement commands to the printer. This could damage the printer if not configured properly.\n\nEnable interactive mode?";

$(function() {
    function UblmesheditViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];
        self.printerState = parameters[1];
        self.printerConnection = parameters[2];

        self.pointValue = ko.observable(undefined);
        self.pointCol = ko.observable(undefined);
        self.pointRow = ko.observable(undefined);
        self.gridSize = undefined;
        self.gridData = ko.observable(undefined);
        self.saveSlot = ko.observable(undefined);
        self.waitingOK = ko.observable(false);
        self.notUBL = ko.observable(false);
        self.showNoMesh = ko.observable(false);
        self.interactiveProbing = ko.observable(false);
        self.inInteractive = false;


        self.interactiveProbing.subscribe(
            function(newValue) {
                if (newValue) self.enableInteractive();
                else self.disableInteractive();
            }
        );

        self.enableInteractive = function() {
            if (!self.settings.settings.plugins.ublmeshedit.interactive_probe_hide_warning()) {
                if(!confirm(interactiveWarning)) {
                    self.interactiveProbing(false);
                    return;
                }
            }

            self.inInteractive = true;
            
            OctoPrint.control.sendGcode(self.settings.settings.plugins.ublmeshedit.interactive_probe_pre_gcode().split("\n"));

            alert("Interactive Probing Mode Enabled. Please wait for your printer to finish homing and running the startup script.");
        }

        self.disableInteractive = function() {
            if (self.inInteractive) {
                OctoPrint.control.sendGcode(self.settings.settings.plugins.ublmeshedit.interactive_probe_post_gcode().split("\n"));
                self.inInteractive = false;
            }
        }

        self.meshButtonColor = function(value, min, max) {
            var minColor = [79, 91, 249];
            var zeroColor = [87, 150, 67];
            var maxColor = [186, 50, 50];
            
            if (value == 0) return `rgb(${zeroColor[0]}, ${zeroColor[1]}, ${zeroColor[2]})`;
            if (value == min) return `rgb(${minColor[0]}, ${minColor[1]}, ${minColor[2]})`;
            if (value == max) return `rgb(${maxColor[0]}, ${maxColor[1]}, ${maxColor[2]})`;

            var lowColor;
            var hiColor;
            var s;
            
            if (value < 0) {
                lowColor = minColor;
                hiColor = zeroColor;
                s = (value - min) / (min * -1);
            } else {
                lowColor = zeroColor;
                hiColor = maxColor;
                s = value / max;
            }

            var r = lowColor[0] + ((hiColor[0] - lowColor[0]) * s);
            var g = lowColor[1] + ((hiColor[1] - lowColor[1]) * s);
            var b = lowColor[2] + ((hiColor[2] - lowColor[2]) * s);

            return `rgb(${r}, ${g}, ${b})`;
        }

        self.waitCommand = function () {
            self.waitingOK(true);
            OctoPrint.simpleApiCommand('ublmeshedit', 'wait_command');
        }

        self.onEventplugin_ublmeshedit_command_complete = function() {
            self.waitingOK(false);
            self.getMesh();
        }

        self.onEventplugin_ublmeshedit_mesh_ready = function(payload) {

            $('#ublMeshEditorGrid').empty();

            self.pointRow(undefined);
            self.pointCol(undefined);
            self.pointValue(undefined);

            if (payload.result!='ok') {
                self.gridSize = undefined;
                self.gridData(undefined);
                self.saveSlot(undefined);
                self.showNoMesh(true);
                return;
            }

            self.showNoMesh(false);

            if (payload.notUBL) {
                self.notUBL(true);
            } else {
                self.notUBL(false);
            }

            self.gridSize = payload.gridSize;
            self.gridData(payload.data);

            self.saveSlot(payload.saveSlot);

            var tbl = $('<table class="mesh-grid" />').appendTo("#ublMeshEditorGrid");

            var valMin = 0;
            var valMax = 0;
            for(var row = 0; row < self.gridSize; row++) {
                for(var col =0; col < self.gridSize; col++) {
                    if (self.gridData()[row][col] < valMin) valMin = self.gridData()[row][col];
                    if (self.gridData()[row][col] > valMax) valMax = self.gridData()[row][col];
                }
            }
 
            for (var row = 0; row < self.gridSize; row++) {
                var tr = $("<tr />");
                tbl.append(tr);
                for (var col = 0; col < self.gridSize; col++) {
                    var  btn = $('<button class="mesh-button" />');
                    var dataCol = col;
                    var dataRow = self.gridSize - 1 - row;
                    if (self.notUBL()) {
                        dataRow = row;
                    }
                    btn.text(self.gridData()[row][col].toFixed(3));
                    btn.attr({'data-col': dataCol, 'data-row': dataRow, 'style': `background-color: ${self.meshButtonColor(self.gridData()[row][col],valMin, valMax)}`});
                    btn.click(self.selectPoint)
                    var td = $('<td />');
                    td.append(btn);
                    tr.append(td);
                }
            }
        }

        self.getMesh = function() {
            OctoPrint.control.sendGcode("M420 V1 T1");
        }

        self.selectPoint = function(event) {
            self.pointCol(parseInt($(event.target).attr('data-col')));
            self.pointRow(parseInt($(event.target).attr('data-row')));
            self.pointValue(parseFloat($(event.target).text()));
            $('#tab_plugin_ublmeshedit button.mesh-button').removeClass('mesh-selected');
            $(event.target).toggleClass('mesh-selected');
            $('#ublMeshEditSavePoint').prop('disabled', false);

            if (self.inInteractive) {
                var i = self.pointCol();
                var j = self.pointRow();
                var zHop = self.settings.settings.plugins.ublmeshedit.interactive_probe_z_hop();
                var zPoint = self.settings.settings.plugins.ublmeshedit.interactive_probe_at_point_z();
                var zFeed = self.settings.settings.plugins.ublmeshedit.interactive_probe_zfeed() * 60;
                var xyFeed = self.settings.settings.plugins.ublmeshedit.interactive_probe_xyfeed() * 60; 

                var cmds = [
                    `G0 Z${zHop} F${zFeed}`,
                    `G42 I${i} J${j} F${xyFeed}`,  
                    `G0 Z${zPoint} F${zFeed}`                  
                ];
                OctoPrint.control.sendGcode(cmds);                
            }
        }

        self.zeroMesh = function() {
            self.waitCommand();
            OctoPrint.control.sendGcode('G29 P0');
        }

        self.savePoint = function() {
            self.waitCommand();
            OctoPrint.control.sendGcode(`M421 I${self.pointCol()} J${self.pointRow()} Z${self.pointValue()}`);
        }

        self.saveToSlot = function() {
            self.waitCommand();
            OctoPrint.control.sendGcode(`G29 S${self.saveSlot()}`);
        }

        self.loadFromSlot = function() {
            self.waitCommand();
            OctoPrint.control.sendGcode(`G29 L${self.saveSlot()}`);
        }

        self.getExportFilename = function() {
            var now = new Date();
            var pad = function(num) {
                if (num < 10) return '0' + num;
                return num;
            }
            var dateTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
            var printerName = undefined;

            for(var i=0;i<self.printerConnection.printerOptions().length;i++) {
                var opts = self.printerConnection.printerOptions()[i];
                if (opts.id == self.printerConnection.selectedPrinter()) {
                    printerName = opts.name;
                    break;
                }
            }
            

            var fileName = self.settings.settings.plugins.ublmeshedit.export_gcode_filename();
            fileName = fileName.replace('{dateTime}', dateTime);
            fileName = fileName.replace('{printerName}', printerName);

            return fileName;
        }

        self.exportMesh = function() {
            var gcode = "";
            gcode += "; Mesh exported from UBL Mesh Editor plugin\n";
            gcode += `; Grid Size = ${self.gridSize}\n`;
            gcode += `; Save Slot = ${self.saveSlot()}\n`;

            for(var row = 0; row < self.gridSize; row++) {
                for(var col =0; col < self.gridSize; col++) {
                    var i = col;
                    var j = self.gridSize - 1 - row;
                    if (self.notUBL()) {
                        j = row;
                    }
                    gcode += `M421 I${i} J${j} Z${self.gridData()[row][col]}\n`;
                }
            }

            gcode += 'M420 V1 T1\n';

            $('#ublMeshEditExportAnchor').attr({
                href: `data:text/x.gcode;charset=utf-8,${encodeURIComponent(gcode)}`,
                download: self.getExportFilename()
            })[0].click();
        }
    }

    /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
    OCTOPRINT_VIEWMODELS.push({
        construct: UblmesheditViewModel,
        dependencies: ["settingsViewModel" , "printerStateViewModel", "connectionViewModel"],
        elements: ["#tab_plugin_ublmeshedit"]
    });
});
