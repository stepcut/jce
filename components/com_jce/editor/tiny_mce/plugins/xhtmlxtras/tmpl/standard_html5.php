<?php

/**
 * @copyright 	Copyright (c) 2009-2015 Ryan Demmer. All rights reserved.
 * @license   	GNU/GPL 2 or later - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
defined('_JEXEC') or die('RESTRICTED');
?>
<div class="ui-form-row">
    <label class="ui-form-label ui-width-3-10" for="contenteditable"><?php echo WFText::_('WF_LABEL_CONTENTEDITBALE');?></label>
    <div class="ui-form-controls ui-width-7-10"><select id="contenteditable">
            <option value=""><?php echo WFText::_('WF_OPTION_NOT_SET');?></option>
            <option value="true"><?php echo WFText::_('WF_OPTION_YES');?></option>
            <option value="false"><?php echo WFText::_('WF_OPTION_NO');?></option>
            <option value="inherit"><?php echo WFText::_('WF_OPTION_INHERIT');?></option>
        </select>
    </div>
</div>

<div class="ui-form-row">
    <label class="ui-form-label ui-width-3-10" for="draggable"><?php echo WFText::_('WF_LABEL_DRAGGABLE');?></label>
    <div class="ui-form-controls ui-width-7-10">
      <select id="draggable">
          <option value=""><?php echo WFText::_('WF_OPTION_NOT_SET');?></option>
          <option value="true"><?php echo WFText::_('WF_OPTION_YES');?></option>
          <option value="false"><?php echo WFText::_('WF_OPTION_NO');?></option>
          <option value="auto"><?php echo WFText::_('WF_OPTION_AUTO');?></option>
        </select>
    </div>
</div>

<div class="ui-form-row">
    <label class="ui-form-label ui-width-3-10" for="hidden"><?php echo WFText::_('WF_LABEL_HIDDEN');?></label>
    <div class="ui-form-controls ui-width-7-10">
      <select id="hidden">
        <option value=""><?php echo WFText::_('WF_OPTION_NOT_SET');?></option>
        <option value=""><?php echo WFText::_('WF_OPTION_NO');?></option>
        <option value="hidden"><?php echo WFText::_('WF_OPTION_YES');?></option>
      </select>
    </div>
</div>

<div class="ui-form-row">
    <label class="ui-form-label ui-width-3-10" for="spellcheck"><?php echo WFText::_('WF_LABEL_SPELLCHECK');?></label>
    <div class="ui-form-controls ui-width-7-10">
      <select id="spellcheck">
        <option value=""><?php echo WFText::_('WF_OPTION_NOT_SET');?></option>
        <option value="true"><?php echo WFText::_('WF_OPTION_YES');?></option>
        <option value="false"><?php echo WFText::_('WF_OPTION_NO');?></option>
      </select>
    </div>
</div>

<!--div class="ui-form-row">
    <label for="custom_attributes" class="ui-form-label ui-width-3-10"><?php echo WFText::_('WF_LABEL_CUSTOM_ATTRIBUTES'); ?></label>
    <div class="ui-form-controls ui-width-7-10">
      <div class="ui-repeatable">
              <div class="ui-form-controls ui-grid ui-grid-small ui-width-9-10">
                  <label class="ui-form-label ui-width-1-10"><?php echo WFText::_('WF_LABEL_NAME'); ?></label>
                  <div class="ui-form-controls ui-width-4-10">
                    <input type="text" name="custom_name[]" />
                  </div>
                  <label class="ui-form-label ui-width-1-10"><?php echo WFText::_('WF_LABEL_VALUE'); ?></label>
                  <div class="ui-form-controls ui-width-4-10">
                    <input type="text" name="custom_value[]" />
                  </div>
              </div>
              <div class="ui-form-controls ui-width-1-10 ui-margin-small-left">
                <button type="button" class="ui-button ui-repeatable-create"><i class="ui-icon-plus"></i></button>
                <button type="button" class="ui-button ui-repeatable-delete"><i class="ui-icon-trash"></i></button>
              </div>
      </div>
    </div>
</div-->
