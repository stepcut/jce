/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2019 Ryan Demmer. All rights reserved.
 * @license   	GNU/GPL 2 or later - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
(function ($, tinyMCEPopup) {
    // http://stackoverflow.com/a/46181
    var emailRex = /(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})/;

    /**
     * From tinymce/plugins/link/plugin.js
     *
     * Released under LGPL License.
     * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
     * License: http://www.tinymce.com/license
     */
    var toggleTargetRules = function (rel, isUnsafe) {
        var rules = ['noopener'];
        var newRel = rel ? rel.split(/\s+/) : [];

        var toString = function (rel) {
            return $.trim(rel.sort().join(' '));
        };

        var addTargetRules = function (rel) {
            rel = removeTargetRules(rel);
            return rel.length ? rel.concat(rules) : rules;
        };

        var removeTargetRules = function (rel) {
            return rel.filter(function (val) {
                return $.inArray(val, rules) === -1;
            });
        };

        newRel = isUnsafe ? addTargetRules(newRel) : removeTargetRules(newRel);
        return newRel.length ? toString(newRel) : null;
    };

    var LinkDialog = {
        settings: {},
        init: function () {
            var self = this,
                ed = tinyMCEPopup.editor,
                se = ed.selection,
                n, el;

            tinyMCEPopup.restoreSelection();

            $('button#insert').click(function (e) {
                self.insert();
                e.preventDefault();
            });

            if (!this.settings.file_browser) {
                $('#href').removeClass('browser');
            }

            $('.email').click(function (e) {
                e.preventDefault();
                LinkDialog.createEmail();
            });

            $('#anchor_container').html(this.getAnchorListHTML('anchor', 'href'));

            // Create Browser Tree
            $('#link-browser').tree({
                collapseTree: true,
                charLength: 50
            }).on('tree:nodeclick', function (e, node) {
                var v;

                if ($(node).hasClass('folder')) {
                    $(this).trigger('tree:togglenode', [e, node]);
                }

                if (!$(node).hasClass('nolink')) {
                    v = $('a', node).attr('href');

                    if (v == '#') {
                        v = $(node).attr('data-id') || $(node).attr('id');
                    }

                    self.insertLink(Wf.String.decode(v));
                }
            }).on('tree:nodeload', function (e, node) {
                var self = this;

                $(this).trigger('tree:toggleloader', node);

                // get node id
                var id = $(node).attr('data-id') || $(node).attr('id');
                
                // create query
                var query = Wf.String.query(Wf.String.unescape(id));

                Wf.JSON.request('getLinks', {
                    'json': query
                }, function (o) {
                    if (o) {
                        if (!o.error) {
                            var ul = $('ul:first', node);

                            if (ul) {
                                $(ul).remove();
                            }

                            if (o.folders && o.folders.length) {
                                $(self).trigger('tree:createnode', [o.folders, node, false]);
                            }

                            $(self).trigger('tree:togglenodestate', [node, true]);
                        } else {
                            Wf.Modal.alert(o.error);
                        }
                    }
                    $(self).trigger('tree:toggleloader', node);
                }, self);
            }).trigger('tree:init');

            /* Search */
            $('#search-button').click(function (e) {
                self._search();
                e.preventDefault();
            }).button({
                icons: {
                    primary: 'uk-icon-search'
                }
            });

            $('#search-clear').click(function (e) {
                if ($(this).hasClass('uk-active')) {
                    $(this).removeClass('uk-active');

                    $('#search-input').val('');
                    $('#search-result').empty().hide();
                }
            });

            $('#search-options-button').click(function (e) {
                e.preventDefault();

                $(this).addClass('uk-active');

                var $p = $('#search-options').parent();

                $('#search-options').height($p.parent().height() - $p.outerHeight() - 15).toggle();

            }).on('close', function () {
                $(this).removeClass('uk-active');
                $('#search-options').hide();
            });

            $(el).on('change keyup', function () {
                if (this.value === "") {
                    $('#search-result').empty().hide();
                    $('#search-clear').removeClass('uk-active');
                }
            });

            // trigger search if input has focus
            $(window).on('keydown', function(e) {
                if (e.keyCode === 13) {
                    if ($('#search-input').is(':focus')) {
                        self._search();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            });

            // setup popups
            WFPopups.setup();

            // if there is a selection
            if (!se.isCollapsed()) {
                n = se.getNode();

                var state = true,
                    v = '';

                function setText(state, v) {
                    if (state && v) {
                        $('#text').val(v).attr('disabled', false);
                    } else {
                        $('#text').val('').attr('disabled', true).parents('tr').hide();
                    }
                }

                if (n) {
                    n = ed.dom.getParent(n, 'A') || n;
                    var v = se.getContent({
                            format: 'text'
                        }),
                        shortEnded = ed.schema.getShortEndedElements();

                    // reset node in IE if the link is the first element
                    if (tinymce.isIE || tinymce.isIE11) {
                        var start = se.getStart(),
                            end = se.getEnd();

                        if (start === end && start.nodeName === "A") {
                            n = start;
                        }
                    }

                    // node is a link
                    if (n.nodeName === "A") {
                        var nodes = n.childNodes,
                            i;
                        if (nodes.length === 0) {
                            state = false;
                        } else {
                            for (i = nodes.length - 1; i >= 0; i--) {
                                if (nodes[i].nodeType !== 3) {
                                    state = false;
                                    break;
                                }
                            }
                        }
                        // selection is a shortEnded element, eg: img
                    } else if (shortEnded[n.nodeName]) {
                        state = false;
                        // selection contains some html
                    } else if (/</.test(se.getContent())) {
                        state = false;
                    }
                }

                // set text value and state
                setText(state, v);
            }

            Wf.init();

            // Enable / disable attributes
            $.each(this.settings.attributes, function (k, v) {
                if (parseInt(v) === 0) {
                    $('#attributes-' + k).hide();
                }
            });

            if (n && n.nodeName == 'A') {
                $('.uk-button-text', '#insert').text(tinyMCEPopup.getLang('update', 'Update', true));

                var href = decodeURIComponent(ed.convertURL(ed.dom.getAttrib(n, 'href')));

                // Setup form data
                $('#href').val(href);
                // attributes
                $.each(['title', 'id', 'style', 'dir', 'lang', 'tabindex', 'accesskey', 'class', 'charset', 'hreflang', 'target'], function (i, k) {
                    $('#' + k).val(ed.dom.getAttrib(n, k));
                });

                $('#dir').val(ed.dom.getAttrib(n, 'dir'));
                $('#rev').val(ed.dom.getAttrib(n, 'rev'), true);

                if (href.charAt(0) == '#') {
                    $('#anchor').val(href);
                }

                $('#classes').val(function() {
                    var elm = this, values = ed.dom.getAttrib(n, 'class');
                    // create array
                    values = values.split(' ');

                    $.each(values, function(i, value) {
                        value = $.trim(value);

                        if (!value || value === ' ') {
                            return true;
                        }
                        
                        if ($('option[value="' + value + '"]', elm).length == 0) {
                            $(elm).append(new Option(value, value));
                        }
                    });

                    return values;
                }).change();

                $('#target').val(ed.dom.getAttrib(n, 'target'));

                // check for popups
                var data = WFPopups.getPopup(n) || {};

                // process rel after popups as it is used by MediaBox
                $('#rel').val(function () {
                    var v = data.rel;

                    if ($.type(v) !== "string") {
                        v = ed.dom.getAttrib(n, 'rel');
                    }

                    if (!v) {
                        return '';
                    }

                    v = ed.dom.encode(v);

                    if ($('option[value="' + v + '"]', this).length == 0) {
                        $(this).append(new Option(v, v));
                        $(this).val(v);
                    }
                });

            } else {
                Wf.setDefaults(this.settings.defaults);
            }

            // hide HTML4 only attributes
            if (ed.settings.schema == 'html5' && ed.settings.validate) {
                $('#rev').parent().parent().hide();
            }

            window.focus();
        },
        getAnchorListHTML: function (id, target) {
            var ed = tinyMCEPopup.editor,
                name;
            var nodes = ed.dom.select('.mce-item-anchor');

            var html = "";

            html += '<select id="' + id + '" class="mceAnchorList" onchange="this.form.' + target + '.value=';
            html += 'this.options[this.selectedIndex].value;">';
            html += '<option value="">---</option>';

            $.each(nodes, function (i, n) {
                if (n.nodeName == 'SPAN') {
                    name = ed.dom.getAttrib(n, 'data-mce-name') || ed.dom.getAttrib(n, 'id');
                } else {
                    if (!n.href) {
                        name = ed.dom.getAttrib(n, 'name') || ed.dom.getAttrib(n, 'id');
                    }
                }

                if (name) {
                    html += '<option value="#' + name + '">' + name + '</option>';
                }
            });

            html += '</select>';

            return html;
        },

        checkPrefix: function (n) {
            var self = this;

            var v = $(n).val();

            if (emailRex.test(v) && !/^\s*mailto:/i.test(v)) {
                Wf.Modal.confirm(tinyMCEPopup.getLang('link_dlg.is_email', 'The URL you entered seems to be an email address, do you want to add the required mailto: prefix?'), function (state) {
                    if (state) {
                        $(n).val('mailto:' + v);
                    }
                    self.insertAndClose();
                });

            } else if (/^\s*www./i.test(v)) {
                Wf.Modal.confirm(tinyMCEPopup.getLang('link_dlg.is_external', 'The URL you entered seems to be an external link, do you want to add the required http:// prefix?'), function (state) {
                    if (state) {
                        $(n).val('http://' + v);
                    }
                    self.insertAndClose();
                });

            } else {
                this.insertAndClose();
            }
        },
        insert: function () {
            tinyMCEPopup.restoreSelection();

            var ed = tinyMCEPopup.editor,
                se = ed.selection;

            if ($('#href').val() == '') {
                Wf.Modal.alert(ed.getLang('link_dlg.no_href', 'A URL is required. Please select a link or enter a URL'), {
                    "close": function () {
                        $('#href').focus();
                    }
                });

                return false;
            }

            if (se.isCollapsed() && $('#text').not(':disabled').val() == '') {
                Wf.Modal.alert(ed.getLang('link_dlg.no_text', 'Please enter some text for the link'), {
                    "close": function () {
                        $('#text').focus();
                    }
                });

                return false;
            }

            return this.checkPrefix($('#href'));
        },
        insertAndClose: function () {
            tinyMCEPopup.restoreSelection();

            var self = ed = tinyMCEPopup.editor,
                se = ed.selection,
                n = se.getNode(),
                args = {},
                el;

            var attribs = ['href', 'title', 'target', 'id', 'style', 'class', 'rel', 'rev', 'charset', 'hreflang', 'dir', 'lang', 'tabindex', 'accesskey', 'type'];

            tinymce.each(attribs, function (k) {
                var v = $('#' + k).val();

                // trim value
                v = tinymce.trim(v);

                if (k == 'href') {
                    // prepare URL
                    v = Wf.String.buildURI(v);
                }

                if (k == 'class') {
                    v = $('#classes').val() || '';

                    if ($.type(v) === 'array') {
                        v = v.join(' ');
                    }
                }

                args[k] = v;
            });

            if (!ed.settings.allow_unsafe_link_target) {
                args.rel = toggleTargetRules(args.rel, args.target == '_blank' && /:\/\//.test(args.href));
            }

            var txt = $('#text').val();

            // no selection
            if (se.isCollapsed()) {
                ed.execCommand('mceInsertContent', false, '<a href="' + args.href + '" id="__mce_tmp">' + txt + '</a>', {
                    skip_undo: 1
                });
                // get link
                el = ed.dom.get('__mce_tmp');

                // set attributes
                ed.dom.setAttribs(el, args);
                // create link on selection or update existing link
            } else {
                // update link
                if (n && n.nodeName === "A") {
                    ed.dom.setAttribs(n, {
                        'href': args.href,
                        'data-mce-tmp': '1'
                    });
                } else {
                    // insert link on selection
                    ed.execCommand('mceInsertLink', false, {
                        'href': args.href,
                        'data-mce-tmp': '1'
                    });
                }

                // restore styles
                ed.dom.setAttrib(n, 'style', ed.dom.getAttrib(n, 'data-mce-style'));

                // get link
                var elms = ed.dom.select('a[data-mce-tmp]');

                // set to null to remove
                args['data-mce-tmp'] = null;

                tinymce.each(elms, function (elm, i) {
                    // set attributes
                    ed.dom.setAttribs(elm, args);

                    // remove id on multiple links
                    if (i > 0 && args.id) {
                        ed.dom.setAttrib(elm, 'id', '');
                    }

                    if (txt) {
                        if ("innerText" in elm) {
                            elm.innerText = txt;
                        } else {
                            elm.textContent = txt;
                        }
                    }
                });

                // get first link item
                if (elms.length) {
                    el = elms[0];
                }
            }

            if (txt) {
                // reset cursor
                ed.selection.select(el);
                ed.selection.collapse(0);
            }

            // get link or element
            el = el || n;

            // Create or remove popup
            WFPopups.createPopup(el);

            ed.undoManager.add();

            ed.nodeChanged();

            // close dialog
            tinyMCEPopup.close();
        },
        setClasses: function (v) {
            Wf.setClasses(v);
        },
        setTargetList: function (v) {
            $('#target').val(v);
        },
        setClassList: function (v) {
            $('#classlist').val(v);
        },
        insertLink: function (v) {
            $('#href').val(tinyMCEPopup.editor.documentBaseURI.toRelative(v));
        },
        createEmail: function () {
            var ed = tinyMCEPopup.editor,
                fields = '<div class="uk-form-horizontal">';

            $.each(['mailto', 'cc', 'bcc', 'subject'], function (i, k) {
                fields += '<div class="uk-form-row"><label class="uk-form-label uk-width-3-10" for="email_' + k + '">' + ed.getLang('link_dlg.' + k, k) + '</label><div class="uk-form-controls uk-width-7-10"><textarea id="email_' + k + '"></textarea></div></div>';
            });

            fields += '</div>';

            Wf.Modal.open(ed.getLang('link_dlg.email', 'Create E-Mail Address'), {
                width: 300,
                open: function () {
                    var v = $('#href').val();

                    if (!v || !emailRex.test(v)) {
                        return;
                    }

                    // split at first & to create email address and arguments
                    var parts = v.replace(/\?/, '&').replace(/\&amp;/g, '&').split('&');
                    var address = parts.shift();

                    $('#email_mailto').val(address.replace(/^mailto\:/, ''));

                    $.each(parts, function (i, s) {
                        var k = s.split('=');

                        if (k.length === 2) {
                            $('#email_' + k[0]).val(k[1]);
                        }
                    });
                },
                buttons: [{
                    text: ed.getLang('link_dlg.create_email', 'Create Email'),
                    click: function () {
                        var args = [],
                            errors = 0;
                        $.each(['mailto', 'cc', 'bcc', 'subject'], function (i, s) {
                            var v = $('#email_' + s).val();

                            if (v) {
                                v = v.replace(/\n\r/g, '');

                                $.each(v.split(','), function (i, o) {
                                    if (s !== 'subject') {
                                        if (!/@/.test(o)) {
                                            var msg = ed.getLang('link_dlg.invalid_email', '%s is not a valid e-mail address!');
                                            Wf.Modal.alert(msg.replace(/%s/, ed.dom.encode(o)));
                                            errors++;
                                        }
                                    }
                                });

                                args.push((s == 'mailto') ? v : s + '=' + v);
                            }
                        });

                        if (errors === 0) {
                            if (args.length) {
                                $('#href').val('mailto:' + args.join('&').replace(/&/, '?'));
                            }

                            $(this).trigger('modal.close');
                        }
                    },
                    attributes: {
                        'class': 'uk-button-primary'
                    },
                    icon: 'uk-icon-check'
                }, {
                    text: ed.getLang('dlg.cancel', 'Cancel'),
                    icon: 'uk-icon-close',
                    attributes: {
                        'class': 'uk-modal-close'
                    }
                }]
            }, fields);
        },
        openHelp: function () {
            Wf.help('link');
        },

        _search: function () {
            var self = this,
                $p = $('#search-result').parent();

            var query = $('#search-input').val();

            if (!query || $('#search-input').hasClass('placeholder')) {
                return;
            }

            $('#search-clear').removeClass('uk-active');
            $('#search-browser').addClass('loading');

            // clean query
            query = $.trim(query.replace(/[\///<>#]/g, ''));

            Wf.JSON.request('doSearch', {
                'json': [query]
            }, function (o) {
                if (o && !o.error) {

                    $('#search-result').empty();

                    if (o.length) {
                        $.each(o, function (i, n) {
                            var $dl = $('<dl class="uk-margin-small" />').appendTo('#search-result');

                            $('<dt class="link uk-margin-small" />').text(n.title).click(function () {
                                self.insertLink(Wf.String.decode(n.link));
                            }).prepend('<i class="uk-icon uk-icon-file-text uk-margin-small-right" />').appendTo($dl);

                            $('<dd class="text">' + n.text + '</dd>').appendTo($dl);

                            if (n.anchors) {
                                $.each(n.anchors, function (i, a) {
                                    $('<dd class="anchor"><i role="presentation" class="uk-icon uk-icon-anchor uk-margin-small-right"></i>#' + a + '</dd>').click(function () {
                                        self.insertLink(Wf.String.decode(n.link + '#' + a));
                                    }).appendTo($dl);
                                });
                            }
                        });

                        $('dl:odd', '#search-result').addClass('odd');

                    }
                    $('#search-options-button').trigger('close');
                    $('#search-result').height($p.parent().height() - $p.outerHeight() - 5).show();
                } else {
                    Wf.Modal.alert(o.error || 'The server return an invalid response');
                }
                $('#search-browser').removeClass('loading');
                $('#search-clear').addClass('uk-active');
            }, self);
        }
    };
    $(document).ready(function () {
        LinkDialog.init();
    });

    window.LinkDialog = LinkDialog;

})(jQuery, tinyMCEPopup);