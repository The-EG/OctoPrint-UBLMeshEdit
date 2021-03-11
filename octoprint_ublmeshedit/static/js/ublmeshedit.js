/*
 * View model for OctoPrint-UBLMeshEdit
 *
 * Author: Taylor Talkington
 * License: AGPLv3
 */
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

        self.pointInCircularBed = function(i, j) {
            var fudge = 0.05;
            var insetDist = self.settings.settings.plugins.ublmeshedit.circular_bed_inset_perc() / 100 * (self.gridSize - 1);
            var c = (self.gridSize - 1) / 2;
            var r = c + insetDist;

            var dist = Math.sqrt( Math.pow(i - c, 2) + Math.pow(j - c, 2));

            return dist <= (r + fudge);
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
                return;
            }

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

            if (self.settings.settings.plugins.ublmeshedit.show_mesh_headers() && self.notUBL()) {
               
                var tr = $('<tr><td>&nbsp;</td></tr>');
                tbl.append(tr);
                
                for (var col=0; col< self.gridSize; col++) {
                    var th = $(`<th>${col}</th>`);
                    tr.append(th);
                }
            }
 
            for (var row = 0; row < self.gridSize; row++) {
                var dataRow = self.gridSize - 1 - row;
                if (self.notUBL()) {
                    dataRow = row;
                }
                var tr = $("<tr />");
                tbl.append(tr);

                if (self.settings.settings.plugins.ublmeshedit.show_mesh_headers()) {

                    var th = $(`<th>${dataRow}</th>`);
                    tr.append(th);
                }

                for (var col = 0; col < self.gridSize; col++) {
                    var  btn = $('<button class="mesh-button" />');
                    var dataCol = col;
                    btn.text(self.gridData()[row][col].toFixed(3));
                    btn.attr({'data-col': dataCol, 'data-row': dataRow, 'style': `background-color: ${self.meshButtonColor(self.gridData()[row][col],valMin, valMax)}`});
                    btn.click(self.selectPoint);

                    if (self.settings.settings.plugins.ublmeshedit.circular_bed()) {
                        if (!self.pointInCircularBed(dataCol, dataRow)) {
                            btn.addClass("mesh-button-offbed")
                        }
                    }

                    
                    var td = $('<td />');
                    if (row == 0) td.addClass('mesh-top');
                    if (row == self.gridSize - 1) td.addClass('mesh-bottom');
                    if (col == 0) td.addClass('mesh-left');
                    if (col == self.gridSize - 1) td.addClass('mesh-right');

                    td.append(btn);
                    tr.append(td);
                }
            }

            if (self.settings.settings.plugins.ublmeshedit.show_mesh_headers() && !self.notUBL()) {
               
                var tr = $('<tr><td>&nbsp;</td></tr>');
                tbl.append(tr);
                
                for (var col=0; col< self.gridSize; col++) {
                    var th = $(`<th>${col}</th>`);
                    tr.append(th);
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
