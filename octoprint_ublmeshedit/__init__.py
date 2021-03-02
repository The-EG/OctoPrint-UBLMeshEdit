# coding=utf-8
from __future__ import absolute_import

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.

import octoprint.plugin

class UBLMeshEditPlugin(octoprint.plugin.AssetPlugin,
						octoprint.plugin.SettingsPlugin,
						octoprint.plugin.SimpleApiPlugin,
                        octoprint.plugin.TemplatePlugin):

	def __init__(self):
		self.wait_mesh = False
		self.mesh_data = None
		self.in_topo = False
		self.slot_num = None
		self.wait_ok = False
		self.skip_first = False
		self.skip_line = False
		self.not_ubl = False

	##~~ SettingsPlugin mixin
	def get_settings_defaults(self):
		return dict(
			export_gcode_filename="Restore Mesh - {printerName} - {dateTime}.gcode",
			hide_non_ubl_warning=False
		)

	def get_template_configs(self):
	 	return [
	 		dict(type="settings", custom_bindings=False)
	 	]

	##~~ AssetPlugin mixin

	def get_assets(self):
		# Define your plugin's asset files to automatically include in the
		# core UI here.
		return dict(
			js=["js/ublmeshedit.js"],
			css=["css/ublmeshedit.css"]
		)

	##~~ SimpleApiPlugin mixin

	def get_api_commands(self):
		return {'wait_command': []}

	def on_api_command(self, command, data):
		if command == 'wait_command':
			self.wait_ok = True

	def on_gcode_sending(self, comm, phase, cmd, cmd_type, gcode, subcode=None, tags=None, *args, **kwargs):
		if cmd=='M420 V1 T1': self.wait_mesh = True
		return None

	def on_gcode_recieved(self, comm, line, *args, **kwargs):
		if ((not self.wait_mesh) and (not self.wait_ok)) or line.strip() in ['','wait','Not SD printing'] or line.strip()[:2]=='T:':
			return line

		if line.strip() == 'Bed Topography Report for CSV:':
			self.in_topo = True
			self.mesh_data = []
			self.not_ubl = False
		elif line.strip() == 'Bilinear Leveling Grid:':
			self.in_topo = True
			self.mesh_data = []
			self.slot_num = None
			self.skip_first = True
			self.skip_line = True
			self.not_ubl = True
		elif line.strip() in ['Mesh is valid','echo:Bed Leveling OFF', 'echo:Bed Leveling ON'] or line.startswith('Subdivided with'):
			self.in_topo = False
		elif line.strip() == 'ok' or line.strip()[:2]=='ok':
			self.wait_mesh = False
			self.skip_first = False
			if self.wait_ok:
				self.wait_ok = False
				self.send_command_complete_event()
			self.send_mesh_collected_event()
		elif 'Storage slot:' in line.strip():
			self.slot_num = int(line.strip()[13:])
		elif self.in_topo:
			if self.skip_line:
				self.skip_line = False
			else:
				row = list(map(float,line.strip().split()))
				if self.skip_first: row = row[1:]
				self.mesh_data.append(row)

		return line

	def on_atcommand_sending(self, comm, phase, cmd, params, tags=None, *args, **kwargs):
		if cmd == 'UBLMESHEDIT': self.wait_mesh = True

	def send_command_complete_event(self):
		event = octoprint.events.Events.PLUGIN_UBLMESHEDIT_COMMAND_COMPLETE
		self._event_bus.fire(event)

	def send_mesh_collected_event(self):
		event = octoprint.events.Events.PLUGIN_UBLMESHEDIT_MESH_READY
		if self.mesh_data is None:
			data = {'result': 'no mesh'}
		else:
			data = {'result': 'ok', 'data': self.mesh_data, 'gridSize': len(self.mesh_data), 'saveSlot': self.slot_num}
		if self.not_ubl: data['notUBL'] = True
		self._event_bus.fire(event, payload=data)

	def register_custom_events(*args, **kwargs):
		return ["mesh_ready", "command_complete"]

	##~~ Softwareupdate hook

	def get_update_information(self):
		# Define the configuration for your plugin to use with the Software Update
		# Plugin here. See https://docs.octoprint.org/en/master/bundledplugins/softwareupdate.html
		# for details.
		return dict(
			ublmeshedit=dict(
				displayName="UBL Mesh Editor",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="The-EG",
				repo="OctoPrint-UBLMeshEdit",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/The-EG/OctoPrint-UBLMeshEdit/archive/{target_version}.zip",

				# release channels
				stable_branch=dict(
					name="Stable",
					branch="main",
					comittish=["main"]
				),
				prerelease_branches=[
					{
						"name": "Release Candidate",
						"branch": "rc",
						"committish": ["rc", "main"]
					}
				]
			)
		)


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "UBL Mesh Editor"

# Starting with OctoPrint 1.4.0 OctoPrint will also support to run under Python 3 in addition to the deprecated
# Python 2. New plugins should make sure to run under both versions for now. Uncomment one of the following
# compatibility flags according to what Python versions your plugin supports!
#__plugin_pythoncompat__ = ">=2.7,<3" # only python 2
#__plugin_pythoncompat__ = ">=3,<4" # only python 3
__plugin_pythoncompat__ = ">=2.7,<4" # python 2 and 3

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = UBLMeshEditPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.gcode.received": __plugin_implementation__.on_gcode_recieved,
		"octoprint.comm.protocol.gcode.sending": __plugin_implementation__.on_gcode_sending,
		"octoprint.comm.protocol.atcommand.sending": __plugin_implementation__.on_atcommand_sending,
		"octoprint.events.register_custom_events": __plugin_implementation__.register_custom_events
	}

