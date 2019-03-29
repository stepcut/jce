/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2019 Ryan Demmer. All rights reserved.
 * @license   	GNU/GPL 2 or later - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
(function () {
    var DOM = tinymce.DOM,
        each = tinymce.each;
    var VK = tinymce.VK;

    tinymce.create('tinymce.plugins.AnchorPlugin', {
        init: function (ed, url) {
            this.editor = ed;
            this.url = url;
            var self = this;

            function isAnchor(n) {
                return ed.dom.getParent(n, 'a.mce-item-anchor');
            }

            ed.settings.allow_html_in_named_anchor = true;

            // Register commands
            ed.addCommand('mceInsertAnchor', function (ui, value) {
                return self._insertAnchor(value);
            });

            ed.onBeforeExecCommand.add(function (ed, cmd, ui, v, o) {
                var se = ed.selection,
                    n = se.getNode();

                // remove empty Definition List
                switch (cmd) {
                    case 'unlink':
                        if (isAnchor(n)) {
                            var id = n.id || n.name || '';

                            if (!id) {
                                return;
                            }

                            // find the associated anchor and remove
                            each(ed.dom.select('a[href]', ed.getBody()), function (node) {
                                var href = ed.dom.getAttrib(node, 'href');

                                if (href === '#' + id) {
                                    ed.dom.remove(node, 1);
                                }
                            });
                        }

                        var href = ed.dom.getAttrib(n, 'href');

                        if (href && href.charAt(0) === "#") {
                            each(ed.dom.select('a[id],a[name]', ed.getBody()), function (node) {
                                var id = node.id || node.name;

                                if (id && href === '#' + id) {
                                    ed.dom.remove(node, 1);
                                }
                            });
                        }

                        break;
                }
            });

            ed.onNodeChange.add(function (ed, cm, n, co) {
                var s = isAnchor(n);

                // clear any existing anchor selections
                ed.dom.removeClass(ed.dom.select('.mce-item-anchor.mce-item-selected'), 'mce-item-selected');

                // set active
                cm.setActive('anchor', s);

                if (s) {
                    ed.dom.addClass(n, 'mce-item-selected');
                }
            });

            // Remove anchor on backspace or delete
            ed.onKeyDown.add(function (ed, e) {
                if (e.keyCode === VK.BACKSPACE || e.keyCode === VK.DELETE) {
                    self._removeAnchor(e);
                }
            });

            ed.onInit.add(function () {
                // Display "a#name" instead of "img" in element path
                if (ed.theme && ed.theme.onResolveName) {
                    ed.theme.onResolveName.add(function (theme, o) {
                        var n = o.node,
                            v, href = n.href;

                        if (o.name === 'a' && (!href || href.charAt(0) == '#') && (n.name || n.id)) {
                            v = n.name || n.id;
                        }

                        if (v) {
                            o.name = 'a#' + v;
                        }
                    });
                }

                if (!ed.settings.compress.css)
                    ed.dom.loadCSS(url + "/css/content.css");
            });

            // Pre-init
            ed.onPreInit.add(function () {
                function isAnchorLink(node) {
                    var href = node.attr('href'),
                        name = node.attr('name') || node.attr('id');

                    // must have a name or id attribute set
                    if (!name) {
                        return false;
                    }
                    // no href, and name set
                    if (!href) {
                        return true;
                    }

                    // a valid anchor link, eg: #test
                    if (href.charAt(0) === "#" && href.length > 1) {
                        return true;
                    }

                    return false;
                }

                // Convert anchor elements to image placeholder
                ed.parser.addNodeFilter('a', function (nodes) {
                    for (var i = 0, len = nodes.length; i < len; i++) {
                        var node = nodes[i],
                            cls = node.attr('class') || '';

                        if (isAnchorLink(node)) {
                            if (!cls || /mce-item-anchor/.test(cls) === false) {
                                cls += ' mce-item-anchor';
                                node.attr('class', tinymce.trim(cls));
                            }
                        }
                    }
                });
            });

            // prevent anchor from collapsing
            ed.onBeforeSetContent.add(function (ed, o) {
                o.content = o.content.replace(/<a id="([^"]+)"><\/a>/gi, '<a id="$1">\uFEFF</a>');
            });
        },
        _removeAnchor: function (e) {
            var ed = this.editor,
                s = ed.selection,
                n = s.getNode();

            if (!s.isCollapsed() && ed.dom.getParent(n, 'a.mce-item-anchor')) {
                ed.undoManager.add();

                ed.formatter.remove('link');

                if (e) {
                    e.preventDefault();
                }
            }
        },
        _getAnchor: function () {
            var ed = this.editor,
                n = ed.selection.getNode(),
                v;

            n = ed.dom.getParent(n, 'a.mce-item-anchor');
            v = ed.dom.getAttrib(n, 'name') || ed.dom.getAttrib(n, 'id');

            return v;
        },
        _insertAnchor: function (v) {
            var ed = this.editor,
                attrib;

            if (!v) {
                ed.windowManager.alert('anchor.invalid');
                return false;
            }

            if (!/^[a-z][a-z0-9\-\_:\.]*$/i.test(v)) {
                ed.windowManager.alert('anchor.invalid');
                return false;
            }

            attrib = 'name';

            // set as id for html5
            if (ed.settings.schema !== 'html4') {
                attrib = 'id';
            }

            var n = ed.selection.getNode();

            //ed.undoManager.add();

            var at = {
                'class': 'mce-item-anchor'
            };

            if (n = ed.dom.getParent(n, 'A')) {
                at[attrib] = v;

                ed.dom.setAttribs(n, at);
            } else {
                if (ed.dom.select('a[' + attrib + '="' + v + '"], img[data-mce-name="' + v + '"], img[id="' + v + '"]', ed.getBody()).length) {
                    ed.windowManager.alert('anchor.exists');
                    return false;
                }

                if (ed.selection.isCollapsed()) {
                    at[attrib] = v;

                    ed.execCommand('mceInsertContent', 0, ed.dom.createHTML('a', {
                        id: '__mce_tmp'
                    }, '\uFEFF'));

                    n = ed.dom.get('__mce_tmp');

                    at.id = at.id || null;

                    ed.dom.setAttribs(n, at);
                    ed.selection.select(n);

                } else {
                    //ed.undoManager.add();

                    at[attrib] = v;

                    ed.execCommand('mceInsertLink', false, '#mce_temp_url#', {
                        skip_undo: 1
                    });

                    at.href = at['data-mce-href'] = null;

                    each(ed.dom.select('a[href="#mce_temp_url#"]'), function (link) {
                        ed.dom.setAttribs(link, at);
                    });
                }
            }
            //}

            ed.execCommand("mceEndUndoLevel");
            ed.nodeChanged();

            return true;
        },
        createControl: function (n, cm) {
            var self = this,
                ed = this.editor;

            switch (n) {
                case 'anchor':
                    var content = DOM.create('div');

                    DOM.add(content, 'h4', {}, ed.getLang('anchor.desc', 'Insert / Edit Anchor'));

                    var input = DOM.add(content, 'input', {
                        type: 'text',
                        id: ed.id + '_input_anchor'
                    });

                    var c = new tinymce.ui.ButtonDialog(cm.prefix + 'anchor', {
                        title: ed.getLang('anchor.desc', 'Inserts an Anchor'),
                        'class': 'mce_anchor',
                        'content': content.innerHTML,
                        'width': 250,
                        'buttons': [{
                            title: ed.getLang('insert', 'Insert'),
                            id: 'insert',
                            click: function (e) {
                                input = DOM.get(ed.id + '_input_anchor');
                                return self._insertAnchor(input.value);
                            },
                            classes: 'mceDialogButtonPrimary',
                            scope: self
                        }, {
                            title: ed.getLang('anchor.remove', 'Remove'),
                            id: 'remove',
                            click: function (e) {
                                if (!DOM.hasClass(e.target, 'disabled')) {
                                    self._removeAnchor();
                                }

                                return true;
                            },
                            scope: self
                        }]
                    }, ed);

                    c.onShowDialog.add(function () {
                        input = DOM.get(ed.id + '_input_anchor');

                        input.value = '';

                        var label = ed.getLang('insert', 'Insert');

                        var v = self._getAnchor();

                        if (v) {
                            input.value = v;
                            label = ed.getLang('update', 'Update');
                        }

                        c.setActive(!!v);

                        c.setButtonDisabled('remove', !v);
                        c.setButtonLabel('insert', label);

                        input.focus();
                    });

                    c.onHideDialog.add(function () {
                        input.value = '';
                    });

                    // Remove the menu element when the editor is removed
                    ed.onRemove.add(function () {
                        c.destroy();
                    });

                    return cm.add(c);
                    break;
            }

            return null;
        }
    });

    // Register plugin
    tinymce.PluginManager.add('anchor', tinymce.plugins.AnchorPlugin);
})();