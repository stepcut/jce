/**
 * @package    JCE
 * @copyright    Copyright (c) 2009-2019 Ryan Demmer. All rights reserved.
 * @copyright   Copyright 2009, Moxiecode Systems AB
 * @license    GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */

(function (tinymce) {
    var DOM = tinymce.DOM,
        Event = tinymce.dom.Event,
        extend = tinymce.extend,
        each = tinymce.each,
        Cookie = tinymce.util.Cookie,
        lastExtID, explode = tinymce.explode;

    // Tell it to load theme specific language pack(s)
    tinymce.ThemeManager.requireLangPack('advanced');

    tinymce.create('tinymce.themes.AdvancedTheme', {

        // Control name lookup, format: title, command
        controls: {
            bold: ['bold_desc', 'Bold'],
            italic: ['italic_desc', 'Italic'],
            underline: ['underline_desc', 'Underline'],
            strikethrough: ['striketrough_desc', 'Strikethrough'],
            justifyleft: ['justifyleft_desc', 'JustifyLeft'],
            justifycenter: ['justifycenter_desc', 'JustifyCenter'],
            justifyright: ['justifyright_desc', 'JustifyRight'],
            justifyfull: ['justifyfull_desc', 'JustifyFull'],
            //bullist : ['bullist_desc', 'InsertUnorderedList'],
            //numlist : ['numlist_desc', 'InsertOrderedList'],
            outdent: ['outdent_desc', 'Outdent'],
            indent: ['indent_desc', 'Indent'],
            //cut : ['cut_desc', 'Cut'],
            //copy : ['copy_desc', 'Copy'],
            //paste : ['paste_desc', 'Paste'],
            undo: ['undo_desc', 'Undo'],
            redo: ['redo_desc', 'Redo'],
            //link : ['link_desc', 'mceLink'],
            unlink: ['unlink_desc', 'unlink'],
            //image : ['image_desc', 'mceImage'],
            cleanup: ['cleanup_desc', 'mceCleanup'],
            help: ['help_desc', 'mceHelp'],
            code: ['code_desc', 'mceCodeEditor'],
            //hr: ['hr_desc', 'InsertHorizontalRule'],
            removeformat: ['removeformat_desc', 'RemoveFormat'],
            sub: ['sub_desc', 'subscript'],
            sup: ['sup_desc', 'superscript'],
            forecolor: ['forecolor_desc', 'ForeColor'],
            forecolorpicker: ['forecolor_desc', 'mceForeColor'],
            backcolor: ['backcolor_desc', 'HiliteColor'],
            backcolorpicker: ['backcolor_desc', 'mceBackColor'],
            //charmap : ['charmap_desc', 'mceCharMap'],
            visualaid: ['visualaid_desc', 'mceToggleVisualAid'],
            //anchor : ['anchor_desc', 'mceInsertAnchor'],
            newdocument: ['newdocument_desc', 'mceNewDocument'],
            blockquote: ['blockquote_desc', 'mceBlockQuote']
        },
        stateControls: ['bold', 'italic', 'underline', 'strikethrough', 'justifyleft', 'justifycenter', 'justifyright', 'justifyfull', 'sub', 'sup', 'blockquote'],

        init: function (ed, url) {
            var self = this,
                s, v, o;

            self.editor = ed;
            self.url = url;
            self.onResolveName = new tinymce.util.Dispatcher(this);
            // add resize dispatcher
            self.onResize = new tinymce.util.Dispatcher(this);

            s = ed.settings;

            ed.forcedHighContrastMode = ed.settings.detect_highcontrast && self._isHighContrast();
            ed.settings.skin = ed.forcedHighContrastMode ? 'highcontrast' : ed.settings.skin;

            // Setup default buttons
            if (!s.theme_buttons1) {
                s = extend({
                    theme_buttons1: "bold,italic,underline,strikethrough,|,justifyleft,justifycenter,justifyright,justifyfull,|,styleselect,formatselect",
                    theme_buttons2: "bullist,numlist,|,outdent,indent,|,undo,redo,|,link,unlink,anchor,image,cleanup,help,code",
                    theme_buttons3: "hr,removeformat,visualaid,|,sub,sup,|,charmap"
                }, s);
            }

            // Default settings
            self.settings = s = extend({
                theme_path: true,
                theme_toolbar_location: 'top',
                theme_blockformats: "p,address,pre,h1,h2,h3,h4,h5,h6",
                theme_toolbar_align: "left",
                theme_statusbar_location: "bottom",
                theme_fonts: "Andale Mono=andale mono,times;Arial=arial,helvetica,sans-serif;Arial Black=arial black,avant garde;Book Antiqua=book antiqua,palatino;Comic Sans MS=comic sans ms,sans-serif;Courier New=courier new,courier;Georgia=georgia,palatino;Helvetica=helvetica;Impact=impact,chicago;Symbol=symbol;Tahoma=tahoma,arial,helvetica,sans-serif;Terminal=terminal,monaco;Times New Roman=times new roman,times;Trebuchet MS=trebuchet ms,geneva;Verdana=verdana,geneva;Webdings=webdings;Wingdings=wingdings,zapf dingbats",
                theme_more_colors: 1,
                theme_row_height: 23,
                theme_resize_horizontal: 1,
                theme_font_sizes: "1,2,3,4,5,6,7",
                theme_font_selector: "span",
                theme_show_current_color: 0,
                readonly: ed.settings.readonly
            }, s);

            if ((v = s.theme_path_location) && v != 'none') {
                s.theme_statusbar_location = s.theme_path_location;
            }

            if (s.theme_statusbar_location == 'none') {
                s.theme_statusbar_location = 0;
            }

            if (!ed.settings.compress.css && ed.settings.content_css !== false) {
                ed.contentCSS.push(ed.baseURI.toAbsolute(url + "/skins/" + ed.settings.skin + "/content.css"));
            }
            // Init editor
            ed.onInit.add(function () {
                if (!ed.settings.readonly) {
                    ed.onNodeChange.add(self._nodeChanged, self);
                    ed.onKeyUp.add(self._updateUndoStatus, self);
                    ed.onMouseUp.add(self._updateUndoStatus, self);
                    ed.dom.bind(ed.dom.getRoot(), 'dragend', function () {
                        self._updateUndoStatus(ed);
                    });
                }
            });

            ed.onPostRender.add(function () {
                DOM.setStyle(ed.id + '_tbl', 'width', '');

                var e = DOM.get(ed.id + '_parent'),
                    ifr = DOM.get(ed.id + '_ifr');

                // Resize iframe and container
                if (s.height) {
                    DOM.setStyle(ifr, 'height', s.height);
                }
                // Resize iframe and container
                if (s.width) {
                    DOM.setStyle(e.parentNode, 'max-width', s.width + 'px');
                    DOM.setStyle(ifr, 'max-width', s.width + 'px');
                }
            });

            ed.onSetProgressState.add(function (ed, b, ti) {
                var co, id = ed.id,
                    tb;

                if (b) {
                    self.progressTimer = setTimeout(function () {
                        co = ed.getContainer();
                        co = co.insertBefore(DOM.create('DIV', {
                            style: 'position:relative'
                        }), co.firstChild);
                        tb = DOM.get(ed.id + '_tbl');

                        DOM.add(co, 'div', {
                            id: id + '_blocker',
                            'class': 'mceBlocker',
                            style: {
                                width: tb.clientWidth + 2,
                                height: tb.clientHeight + 2
                            }
                        });
                        DOM.add(co, 'div', {
                            id: id + '_progress',
                            'class': 'mceProgress',
                            style: {
                                left: tb.clientWidth / 2,
                                top: tb.clientHeight / 2
                            }
                        });
                    }, ti || 0);
                } else {
                    DOM.remove(id + '_blocker');
                    DOM.remove(id + '_progress');
                    clearTimeout(self.progressTimer);
                }
            });

            // Load CSS
            if (!ed.settings.compress.css) {
                DOM.loadCSS(s.editor_css ? ed.documentBaseURI.toAbsolute(s.editor_css) : url + '/skins/' + ed.settings.skin + '/ui.css');

                if (s.skin_variant) {
                    DOM.loadCSS(url + '/skins/' + ed.settings.skin + '/ui_' + s.skin_variant + '.css');
                }
            }
        },
        _isHighContrast: function () {
            var actualColor, div = DOM.add(DOM.getRoot(), 'div', {
                'style': 'background-color: rgb(171,239,86);'
            });

            actualColor = (DOM.getStyle(div, 'background-color', true) + '').toLowerCase().replace(/ /g, '');
            DOM.remove(div);

            return actualColor != 'rgb(171,239,86)' && actualColor != '#abef56';
        },
        createControl: function (n, cf) {
            var cd, c;

            if (c = cf.createControl(n))
                return c;

            if ((cd = this.controls[n]))
                return cf.createButton(n, {
                    title: "advanced." + cd[0],
                    cmd: cd[1],
                    ui: cd[2],
                    value: cd[3]
                });
        },
        execCommand: function (cmd, ui, val) {
            var f = this['_' + cmd];

            if (f) {
                f.call(this, ui, val);
                return true;
            }

            return false;
        },

        renderUI: function (o) {
            var n, ic, tb, self = this,
                ed = self.editor,
                s = self.settings,
                sc, p, nl;

            if (ed.settings) {
                ed.settings.aria_label = s.aria_label + ed.getLang('advanced.help_shortcut');
            }

            var skin = "defaultSkin";

            if (ed.settings.skin !== "default") {
                skin += ' ' + ed.settings.skin + 'Skin';

                if (s.skin_variant) {
                    skin += ' ' + ed.settings.skin + 'Skin' + self._ufirst(s.skin_variant);
                }
            }

            n = p = DOM.create('div', {
                role: 'application',
                'aria-labelledby': ed.id + '_voice',
                id: ed.id + '_parent',
                'class': 'mceEditor ' + skin + (ed.settings.directionality == "rtl" ? ' mceRtl' : '')
            });

            DOM.add(n, 'span', {
                'class': 'mceVoiceLabel',
                'style': 'display:none;',
                id: ed.id + '_voice'
            }, s.aria_label);

            n = sc = DOM.add(n, 'div', {
                role: "presentation",
                id: ed.id + '_tbl',
                'class': 'mceLayout'
            });

            ic = self._createLayout(s, n, o, p);

            n = o.targetNode;

            DOM.addClass(sc.firstChild, 'mceFirst');
            DOM.addClass(sc.lastChild, 'mceLast');

            DOM.insertAfter(p, n);

            Event.add(ed.id + '_path_row', 'click', function (e) {
                e = DOM.getParent(e.target, 'a');

                if (e && e.nodeName == 'A') {
                    self._sel(e.className.replace(/^.*mcePath_([0-9]+).*$/, '$1'));
                    return false;
                }
            });

            if (!ed.getParam('accessibility_focus')) {
                Event.add(DOM.add(p, 'a', {
                    href: '#'
                }, '<!-- IE -->'), 'focus', function () {
                    tinyMCE.get(ed.id).focus();
                });
            }

            if (s.theme_toolbar_location == 'external') {
                o.deltaHeight = 0;
            }

            self.deltaHeight = o.deltaHeight;
            o.targetNode = null;

            ed.onKeyDown.add(function (ed, evt) {
                var DOM_VK_F10 = 121,
                    DOM_VK_F11 = 122;

                if (evt.altKey) {
                    if (evt.keyCode === DOM_VK_F10) {
                        // Make sure focus is given to toolbar in Safari.
                        // We can'self do this in IE as it prevents giving focus to toolbar when editor is in a frame
                        if (tinymce.isWebKit) {
                            window.focus();
                        }
                        self.toolbarGroup.focus();
                        return Event.cancel(evt);
                    } else if (evt.keyCode === DOM_VK_F11) {
                        DOM.get(ed.id + '_path_row').focus();
                        return Event.cancel(evt);
                    }
                }
            });

            /*if (ed.getParam('accessibility_shortcut', 1)) {
             // alt+0 is the UK recommended shortcut for accessing the list of access controls.
             ed.addShortcut('alt+0', '', 'mceShortcuts', self);
             }*/

            return {
                iframeContainer: ic,
                editorContainer: ed.id + '_parent',
                sizeContainer: sc,
                deltaHeight: o.deltaHeight
            };
        },
        getInfo: function () {
            return {
                longname: 'Advanced theme',
                author: 'Moxiecode Systems AB',
                authorurl: 'http://tinymce.moxiecode.com',
                version: tinymce.majorVersion + "." + tinymce.minorVersion
            };
        },
        resizeBy: function (dw, dh) {
            var e = DOM.get(this.editor.id + '_ifr');

            this.resizeTo(e.clientWidth + dw, e.clientHeight + dh);
        },
        resizeTo: function (w, h, store) {
            var ed = this.editor,
                s = this.settings,
                e = DOM.get(ed.id + '_parent'),
                ifr = DOM.get(ed.id + '_ifr');

            // Boundery fix box
            w = Math.max(s.theme_resizing_min_width || 100, w);
            h = Math.max(s.theme_resizing_min_height || 100, h);
            w = Math.min(s.theme_resizing_max_width || 0xFFFF, w);
            h = Math.min(s.theme_resizing_max_height || 0xFFFF, h);

            // Resize iframe and container
            DOM.setStyle(ifr, 'height', h);

            if (s.theme_resize_horizontal) {
                DOM.setStyle(e.parentNode, 'max-width', w + 'px');
                DOM.setStyle(ifr, 'max-width', w + 'px');
            }

            // Store away the size
            if (store && s.use_state_cookies !== false) {
                Cookie.setHash("wf_editor_size_" + ed.id, {
                    cw: w,
                    ch: h
                });
            }

            // dispatch
            this.onResize.dispatch();
        },
        destroy: function () {
            var id = this.editor.id;

            Event.clear(id + '_resize');
            Event.clear(id + '_path_row');
            Event.clear(id + '_external_close');
        },
        // Internal functions

        _createLayout: function (s, tb, o, p) {
            var self = this,
                ed = self.editor,
                lo = s.theme_toolbar_location,
                sl = s.theme_statusbar_location,
                n, ic, etb, c;

            if (s.readonly) {
                ic = DOM.add(tb, 'div', {
                    'class': 'mceIframeContainer'
                });

                return ic;
            }

            // Create toolbar container at top
            if (lo == 'top') {
                self._addToolbars(tb, o);
            }

            // Create external toolbar
            if (lo == 'external') {
                n = c = DOM.create('div', {
                    style: 'position:relative'
                });
                n = DOM.add(n, 'div', {
                    id: ed.id + '_external',
                    'class': 'mceExternalToolbar'
                });
                DOM.add(n, 'a', {
                    id: ed.id + '_external_close',
                    'class': 'mceExternalClose'
                });
                n = DOM.add(n, 'div', {
                    id: ed.id + '_tblext',
                    cellSpacing: 0,
                    cellPadding: 0
                });

                p.insertBefore(c, p.firstChild);

                self._addToolbars(n, o);

                ed.onMouseUp.add(function () {
                    var e = DOM.get(ed.id + '_external');
                    DOM.show(e);

                    DOM.hide(lastExtID);

                    var f = Event.add(ed.id + '_external_close', 'click', function () {
                        DOM.hide(ed.id + '_external');
                        Event.remove(ed.id + '_external_close', 'click', f);

                        return false;
                    });

                    DOM.show(e);
                    DOM.setStyle(e, 'top', 0 - DOM.getRect(ed.id + '_tblext').h - 1);

                    // Fixes IE rendering bug
                    DOM.hide(e);
                    DOM.show(e);
                    e.style.filter = '';

                    lastExtID = ed.id + '_external';

                    e = null;
                });
            }

            if (sl == 'top') {
                self._addStatusBar(tb, o);
            }

            // Create iframe container
            n = ic = DOM.add(tb, 'div', {
                'class': 'mceIframeContainer'
            });

            // Create toolbar container at bottom
            if (lo == 'bottom') {
                self._addToolbars(tb, o);
            }

            if (sl == 'bottom') {
                self._addStatusBar(tb, o);
            }

            return ic;
        },

        _addControls: function (v, tb) {
            var self = this,
                s = self.settings,
                ed = self.editor,
                di, cf = self.editor.controlManager;

            if (s.theme_disable && !self._disabled) {
                di = {};

                each(explode(s.theme_disable), function (v) {
                    di[v] = 1;
                });

                self._disabled = di;
            } else {
                di = self._disabled;
            }

            each(explode(v), function (n) {
                var c;

                if (di && di[n]) {
                    return;
                }

                c = self.createControl(n, cf);

                if (c) {
                    tb.add(c);
                }
            });
        },
        _addToolbars: function (c, o) {
            var self = this,
                i, tb, ed = self.editor,
                s = self.settings,
                v, cf = ed.controlManager,
                di, n, h = [],
                a, toolbarGroup, toolbarsExist = false;

            toolbarGroup = cf.createToolbarGroup('toolbargroup', {
                'name': ed.getLang('advanced.toolbar'),
                'tab_focus_toolbar': ed.getParam('theme_tab_focus_toolbar')
            });

            self.toolbarGroup = toolbarGroup;

            a = s.theme_toolbar_align.toLowerCase();
            a = 'mce' + self._ufirst(a);

            n = DOM.add(c, 'div', {
                'class': 'mceToolbar ' + a,
                "role": "toolbar"
            });

            // Create toolbar and add the controls
            for (i = 1;
                (v = s['theme_buttons' + i]); i++) {
                toolbarsExist = true;

                tb = cf.createToolbar("toolbar" + i, {
                    'class': 'mceToolbarRow' + i
                });

                if (s['theme_buttons' + i + '_add']) {
                    v += ',' + s['theme_buttons' + i + '_add'];
                }

                if (s['theme_buttons' + i + '_add_before']) {
                    v = s['theme_buttons' + i + '_add_before'] + ',' + v;
                }

                self._addControls(v, tb);

                toolbarGroup.add(tb);

                o.deltaHeight -= s.theme_row_height;
            }

            // Handle case when there are no toolbar buttons and ensure editor height is adjusted accordingly
            if (!toolbarsExist) {
                o.deltaHeight -= s.theme_row_height;
            }

            h.push(toolbarGroup.renderHTML());

            h.push(DOM.createHTML('a', {
                href: '#',
                accesskey: 'z',
                title: ed.getLang("advanced.toolbar_focus"),
                onfocus: 'tinyMCE.getInstanceById(\'' + ed.id + '\').focus();'
            }, '<!-- IE -->'));

            DOM.setHTML(n, h.join(''));
        },
        _addStatusBar: function (tb, o) {
            var n, self = this,
                ed = self.editor,
                s = self.settings,
                r, mf, me, td;

            n = td = DOM.add(tb, 'div', {
                'class': 'mceStatusbar'
            });

            n = DOM.add(n, 'div', {
                id: ed.id + '_path_row',
                'role': 'group',
                'aria-labelledby': ed.id + '_path_voice',
                'class': 'mcePathRow'
            });

            if (s.theme_path) {
                DOM.add(n, 'span', {
                    id: ed.id + '_path_voice',
                    'class': 'mcePathLabel'
                }, ed.translate('advanced.path') + ': ');
            } else {
                DOM.add(n, 'span', {}, '&#160;');
            }

            if (s.theme_resizing) {
                DOM.add(td, 'a', {
                    id: ed.id + '_resize',
                    onclick: "return false;",
                    'class': 'mceResize',
                    tabIndex: "-1"
                });

                if (s.use_state_cookies !== false) {
                    ed.onPostRender.add(function () {
                        var o = Cookie.getHash("wf_editor_size_" + ed.id),
                            c = DOM.get(ed.id + '_tbl');

                        if (!o) {
                            return;
                        }

                        self.resizeTo(o.cw, o.ch, false);
                    });
                }

                ed.onPostRender.add(function () {
                    Event.add(ed.id + '_resize', 'click', function (e) {
                        e.preventDefault();
                    });

                    Event.add(ed.id + '_resize', 'mousedown', function (e) {
                        var mouseMoveHandler1, mouseMoveHandler2,
                            mouseUpHandler1, mouseUpHandler2,
                            startX, startY, startWidth, startHeight, width, height, ifrElm;

                        function resizeOnMove(e) {
                            e.preventDefault();

                            width = startWidth + (e.screenX - startX);
                            height = startHeight + (e.screenY - startY);

                            self.resizeTo(width, height);
                        }

                        function endResize(e) {
                            // Stop listening
                            Event.remove(DOM.doc, 'mousemove', mouseMoveHandler1);
                            Event.remove(ed.getDoc(), 'mousemove', mouseMoveHandler2);
                            Event.remove(DOM.doc, 'mouseup', mouseUpHandler1);
                            Event.remove(ed.getDoc(), 'mouseup', mouseUpHandler2);

                            width = startWidth + (e.screenX - startX);
                            height = startHeight + (e.screenY - startY);
                            self.resizeTo(width, height, true);

                            ed.nodeChanged();
                        }

                        e.preventDefault();

                        // Get the current rect size
                        startX = e.screenX;
                        startY = e.screenY;
                        ifrElm = DOM.get(self.editor.id + '_ifr');
                        startWidth = width = ifrElm.clientWidth;
                        startHeight = height = ifrElm.clientHeight;

                        // Register envent handlers
                        mouseMoveHandler1 = Event.add(DOM.doc, 'mousemove', resizeOnMove);
                        mouseMoveHandler2 = Event.add(ed.getDoc(), 'mousemove', resizeOnMove);
                        mouseUpHandler1 = Event.add(DOM.doc, 'mouseup', endResize);
                        mouseUpHandler2 = Event.add(ed.getDoc(), 'mouseup', endResize);
                    });
                });
            }

            o.deltaHeight -= 21;
            n = tb = null;
        },
        _updateUndoStatus: function (ed) {
            var cm = ed.controlManager,
                um = ed.undoManager;

            cm.setDisabled('undo', !um.hasUndo() && !um.typing);
            cm.setDisabled('redo', !um.hasRedo());
        },
        _nodeChanged: function (ed, cm, n, co, ob) {
            var self = this,
                p, de = 0,
                v, c, s = self.settings;

            tinymce.each(self.stateControls, function (c) {
                cm.setActive(c, ed.queryCommandState(self.controls[c][1]));
            });

            function getParent(name) {
                var i, parents = ob.parents,
                    func = name;

                if (typeof (name) == 'string') {
                    func = function (node) {
                        return node.nodeName == name;
                    };
                }

                for (i = 0; i < parents.length; i++) {
                    if (func(parents[i]))
                        return parents[i];
                }
            }

            cm.setActive('visualaid', ed.hasVisual);
            self._updateUndoStatus(ed);
            cm.setDisabled('outdent', !ed.queryCommandState('Outdent'));

            var link = getParent('A');
            var img = getParent('IMG');

            function isLink(n) {
                return !!n && (n.href || (n.id || n.name));
            }

            if (c = cm.get('unlink')) {
                c.setDisabled(!isLink(link));
                c.setActive(isLink(link));
            }

            if (s.theme_path && s.theme_statusbar_location) {
                p = DOM.get(ed.id + '_path') || DOM.add(ed.id + '_path_row', 'span', {
                    id: ed.id + '_path',
                    'class': 'mcePathPath'
                });

                if (self.statusKeyboardNavigation) {
                    self.statusKeyboardNavigation.destroy();
                    self.statusKeyboardNavigation = null;
                }

                DOM.setHTML(p, '');

                getParent(function (n) {
                    var na = n.nodeName.toLowerCase(),
                        u, pi, ti = '';

                    // Ignore non element and bogus/hidden elements
                    if (n.nodeType != 1 || na === 'br' || n.getAttribute('data-mce-bogus') || DOM.hasClass(n, 'mce-item-hidden') || DOM.hasClass(n, 'mce-item-removed') || DOM.hasClass(n, 'mce-item-shim'))
                        return;

                    // Handle prefix
                    if (tinymce.isIE && n.scopeName && n.scopeName !== 'HTML')
                        na = n.scopeName + ':' + na;

                    // Remove internal prefix
                    na = na.replace(/mce\:/g, '');

                    // Handle node name
                    switch (na) {
                        case 'b':
                            na = 'strong';
                            break;

                        case 'img':
                            if (v = DOM.getAttrib(n, 'src')) {
                                ti += 'src: ' + v + ' ';
                            }
                            break;

                        case 'a':
                            if (v = DOM.getAttrib(n, 'href')) {
                                ti += 'href: ' + v + ' ';
                            }

                            break;

                        case 'font':
                            if (v = DOM.getAttrib(n, 'face')) {
                                ti += 'font: ' + v + ' ';
                            }

                            if (v = DOM.getAttrib(n, 'size')) {
                                ti += 'size: ' + v + ' ';
                            }

                            if (v = DOM.getAttrib(n, 'color')) {
                                ti += 'color: ' + v + ' ';
                            }

                            break;

                        case 'span':
                            if (v = DOM.getAttrib(n, 'style')) {
                                ti += 'style: ' + v + ' ';
                            }

                            break;
                    }

                    if (v = DOM.getAttrib(n, 'id'))
                        ti += 'id: ' + v + ' ';

                    if (v = DOM.getAttrib(n, 'class')) {
                        v = v.replace(/mce-item-[\w]+/g, '');
                        v = tinymce.trim(v);

                        if (v) {
                            ti += 'class: ' + v + ' ';

                            if (ed.dom.isBlock(n) || na == 'img' || na == 'span') {
                                na += '.' + v;
                            }
                        }
                    }

                    na = na.replace(/(html:)/g, '');

                    na = {
                        name: na,
                        node: n,
                        title: ti
                    };

                    self.onResolveName.dispatch(self, na);
                    ti = na.title;
                    na = na.name;

                    pi = DOM.create('a', {
                        'href': "javascript:;",
                        role: 'button',
                        onmousedown: "return false;",
                        title: ti,
                        'class': 'mcePath_' + (de++)
                    }, '<span class="mceText">' + na + '</span>');

                    // WFEditor - Added mcePath class to path span

                    if (p.hasChildNodes()) {
                        p.insertBefore(DOM.create('span', {
                            'aria-hidden': 'true'
                        }, '\u00a0\u00bb '), p.firstChild);
                        p.insertBefore(pi, p.firstChild);
                    } else
                        p.appendChild(pi);

                }, ed.getBody());

                if (DOM.select('a', p).length > 0) {
                    self.statusKeyboardNavigation = new tinymce.ui.KeyboardNavigation({
                        root: ed.id + "_path_row",
                        items: DOM.select('a', p),
                        excludeFromTabOrder: true,
                        onCancel: function () {
                            ed.focus();
                        }
                    }, DOM);
                }

                var row = DOM.get(ed.id + "_path_row"),
                    status = row.parentNode,
                    mod = 20;

                tinymce.each(status.childNodes, function (n) {
                    if (DOM.hasClass(n, 'mcePathRow')) {
                        return true;
                    }

                    mod += n.offsetWidth;
                });

                tinymce.each(DOM.select('a', p), function (n) {
                    DOM.removeClass(n, 'mcePathHidden');

                    if ((p.offsetWidth + mod + DOM.getPrev(p, '.mcePathLabel').offsetWidth) > status.offsetWidth) {
                        DOM.addClass(n, 'mcePathHidden');
                    }
                });
            }
        },
        // Commands gets called by execCommand

        _sel: function (v) {
            this.editor.execCommand('mceSelectNodeDepth', false, v);
        },
        /**
         * WF Editor Custom Help Command
         */
        _mceHelp: function () {
            var ed = this.editor;

            ed.windowManager.open({
                url: ed.getParam('site_url') + 'index.php?option=com_jce&view=help&tmpl=component&lang=' + ed.getParam('language') + '&section=editor&category=editor&article=about',
                inline: true,
                //width: 780,
                //height: 560,
                size: 'mce-modal-landscape-full'
            }, {
                    theme_url: this.url
                });
        },

        _mceNewDocument: function () {
            var ed = this.editor;

            ed.windowManager.confirm('advanced.newdocument', function (s) {
                if (s) {
                    ed.execCommand('mceSetContent', false, '');
                }
            });
        },

        _ufirst: function (s) {
            return s.substring(0, 1).toUpperCase() + s.substring(1);
        }
    });

    tinymce.ThemeManager.add('advanced', tinymce.themes.AdvancedTheme);
}(tinymce));