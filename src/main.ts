import { Extension } from "@codemirror/state";
import { flowEditorInfo, toggleFlowEditor } from "basics/codemirror/flowEditor";
import { registerEditorMenus } from "basics/menus/registerMenus";
import { App, Platform, Plugin } from "obsidian";

import { getActiveCM } from "basics/codemirror";
import { ObsidianEnactor } from "basics/enactor/obsidian";
import { loadFlowCommands } from "basics/flow/flowCommands";
import { replaceAllEmbed, replaceAllTables } from "basics/flow/markdownPost";
import {
  patchWorkspaceForFlow,
  patchWorkspaceLeafForFlow,
} from "basics/flow/patchWorkspaceForFlow";
import { BasicDefaultSettings } from "basics/schemas/settings";
import { MakeBasicsSettingsTab } from "basics/ui/SettingsPanel";
import { Enactor } from "./basics/enactor/enactor";
import { MakeMDEnactor } from "./basics/enactor/makemd";
import { toggleMark } from "./basics/menus/inlineStylerView/marks";
import { Command } from "./basics/types/command";
import { MakeBasicsSettings } from "./basics/types/settings";

import "css/DefaultVibe.css";
import "css/Editor/Flow/FlowEditor.css";
import "css/Editor/Flow/FlowState.css";
import "css/Editor/Flow/Properties.css";
import "css/Editor/Frames/Insert.css";
import "css/Editor/Frames/Node.css";
import "css/Editor/Frames/Overlay.css";
import "css/Editor/Frames/Page.css";
import "css/Editor/Frames/Slides.css";
import "css/Editor/Properties/DatePicker.css";
import "css/Menus/ColorPicker.css";
import "css/Menus/InlineMenu.css";
import "css/Menus/MainMenu.css";
import "css/Menus/MakeMenu.css";
import "css/Menus/Menu.css";
import "css/Menus/StickerMenu.css";
import "css/Modal/Modal.css";
import "css/Obsidian/Mods.css";

export default class MakeBasicsPlugin extends Plugin {
  public settings: MakeBasicsSettings;
  public extensions: Extension[];
  public commands: Command[];
  public app: App;
  public enactor: Enactor;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MakeBasicsSettingsTab(this.app, this));
    if (this.app.plugins.getPlugin("make-md")) {
      const mkmdEnactor = new MakeMDEnactor(
        this.app.plugins.getPlugin("make-md").superstate,
        this
      );
      this.enactor = mkmdEnactor;
    } else {
      this.enactor = new ObsidianEnactor(this);
    }
    this.loadBasics();
  }

  isTouchScreen() {
    return Platform.isMobile;
  }

  toggleBold() {
    const cm = getActiveCM(this);
    if (cm) {
      cm.dispatch({
        annotations: toggleMark.of("strong"),
      });
    }
  }
  toggleEm() {
    const cm = getActiveCM(this);
    if (cm) {
      cm.dispatch({
        annotations: toggleMark.of("em"),
      });
    }
  }
  openFlow() {
    const cm = getActiveCM(this);
    if (cm) {
      const value = cm.state.field(flowEditorInfo, false);
      const currPosition = cm.state.selection.main;
      for (const flowEditor of value) {
        if (
          flowEditor.from < currPosition.to &&
          flowEditor.to > currPosition.from
        ) {
          cm.dispatch({
            annotations: toggleFlowEditor.of([flowEditor.id, 2]),
          });
        }
      }
    }
  }
  closeFlow() {
    const cm = getActiveCM(this);
    if (cm) {
      const value = cm.state.field(flowEditorInfo, false);
      const currPosition = cm.state.selection.main;
      for (const flowEditor of value) {
        if (
          flowEditor.from < currPosition.to &&
          flowEditor.to > currPosition.from
        ) {
          cm.dispatch({
            annotations: toggleFlowEditor.of([flowEditor.id, 0]),
          });
        }
      }
    }
  }

  loadBasics() {
    this.enactor.load();
    document.body.classList.toggle(
      "mk-mobile-sidepanel",
      this.settings.mobileSidepanel
    );
    document.body.classList.toggle(
      "mk-mobile-styler",
      this.settings.mobileMakeBar
    );
    registerEditorMenus(this);

    if (this.settings.editorFlow) {
      patchWorkspaceForFlow(this);
      patchWorkspaceLeafForFlow(this);
      document.body.classList.toggle(
        "mk-flow-replace",
        this.settings.editorFlow
      );
      document.body.classList.toggle(
        "mk-flow-" + this.settings.editorFlowStyle,
        true
      );

      this.registerMarkdownPostProcessor((element, context) => {
        const removeAllFlowMarks = (el: HTMLElement) => {
          const embeds = el.querySelectorAll(".internal-embed.markdown-embed");

          for (let index = 0; index < embeds.length; index++) {
            const embed = embeds.item(index);
            if (
              embed.previousSibling &&
              embed.previousSibling.textContent.slice(-1) == "!"
            )
              embed.previousSibling.textContent =
                embed.previousSibling.textContent.slice(0, -1);
          }
        };
        removeAllFlowMarks(element);
        replaceAllTables(this, element, context);
        replaceAllEmbed(element, context, this, this.app);
      });
      loadFlowCommands(this);
    }
    this.reloadExtensions(true);
  }
  reloadExtensions(firstLoad: boolean) {
    this.enactor.loadExtensions(firstLoad);
  }
  async loadSettings() {
    this.settings = Object.assign({}, BasicDefaultSettings, await this.loadData());

    this.saveSettings();
  }

  async saveSettings(refresh = true) {

    await this.saveData(this.settings);
    
    
  }
}
