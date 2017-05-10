/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2017 Ryan Demmer. All rights reserved.
 * @copyright   Copyright 2009, Moxiecode Systems AB
 * @license   	GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
(function () {
    var each = tinymce.each,
        VK = tinymce.VK,
        Event = tinymce.dom.Event,
        Schema = tinymce.html.Schema,
        DomParser = tinymce.html.DomParser,
        Serializer = tinymce.html.Serializer,
        Dispatcher = tinymce.util.Dispatcher,
        RangeUtils = tinymce.dom.RangeUtils,
        Node = tinymce.html.Node;

    var styleProps = [
        'background', 'background-attachment', 'background-color', 'background-image', 'background-position', 'background-repeat',
        'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style', 'border-bottom-width', 'border-color', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-style', 'border-top', 'border-top-color', 'border-top-style', 'border-top-width', 'border-width', 'outline', 'outline-color', 'outline-style', 'outline-width',
        'height', 'max-height', 'max-width', 'min-height', 'min-width', 'width',
        'font', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
        'content', 'counter-increment', 'counter-reset', 'quotes',
        'list-style', 'list-style-image', 'list-style-position', 'list-style-type',
        'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
        'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
        'bottom', 'clear', 'clip', 'cursor', 'display', 'float', 'left', 'overflow', 'position', 'right', 'top', 'visibility', 'z-index',
        'orphans', 'page-break-after', 'page-break-before', 'page-break-inside', 'widows',
        'border-collapse', 'border-spacing', 'caption-side', 'empty-cells', 'table-layout',
        'color', 'direction', 'letter-spacing', 'line-height', 'text-align', 'text-decoration', 'text-indent', 'text-shadow', 'text-transform', 'unicode-bidi', 'vertical-align', 'white-space', 'word-spacing'
    ];

    var pixelStyles = [
        'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'
    ];

    var borderStyles = [
        'border', 'border-width', 'border-style', 'border-color',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'
    ];

    var Utils = function () {
        function filter(content, items) {
            tinymce.each(items, function (v) {
                if (v.constructor == RegExp) {
                    content = content.replace(v, '');
                } else {
                    content = content.replace(v[0], v[1]);
                }
            });

            return content;
        }

        /**
         * Gets the innerText of the specified element. It will handle edge cases
         * and works better than textContent on Gecko.
         *
         * @param {String} html HTML string to get text from.
         * @return {String} String of text with line feeds.
         */
        function innerText(html) {
            var schema = new Schema(),
                domParser = new DomParser({}, schema),
                text = '';
            var shortEndedElements = schema.getShortEndedElements();
            var ignoreElements = tinymce.makeMap('script noscript style textarea video audio iframe object', ' ');
            var blockElements = schema.getBlockElements();

            function walk(node) {
                var name = node.name,
                    currentNode = node;

                if (name === 'br') {
                    text += '\n';
                    return;
                }

                // img/input/hr
                if (shortEndedElements[name]) {
                    text += ' ';
                }

                // Ingore script, video contents
                if (ignoreElements[name]) {
                    text += ' ';
                    return;
                }

                if (node.type == 3) {
                    text += node.value;
                }

                // Walk all children
                if (!node.shortEnded) {
                    if ((node = node.firstChild)) {
                        do {
                            walk(node);
                        } while ((node = node.next));
                    }
                }

                // Add \n or \n\n for blocks or P
                if (blockElements[name] && currentNode.next) {
                    text += '\n';

                    if (name == 'p') {
                        text += '\n';
                    }
                }
            }

            html = filter(html, [
                /<!\[[^\]]+\]>/g // Conditional comments
            ]);

            walk(domParser.parse(html));

            return text;
        }

        var getInnerFragment = function (html) {
            var startFragment = '<!--StartFragment-->';
            var endFragment = '<!--EndFragment-->';
            var startPos = html.indexOf(startFragment);
            if (startPos !== -1) {
                var fragmentHtml = html.substr(startPos + startFragment.length);
                var endPos = fragmentHtml.indexOf(endFragment);
                if (endPos !== -1 && /^<\/(p|h[1-6]|li)>/i.test(fragmentHtml.substr(endPos + endFragment.length, 5))) {
                    return fragmentHtml.substr(0, endPos);
                }
            }

            return html;
        };

        /**
         * Trims the specified HTML by removing all WebKit fragments, all elements wrapping the body trailing BR elements etc.
         *
         * @param {String} html Html string to trim contents on.
         * @return {String} Html contents that got trimmed.
         */
        function trimHtml(html) {
            function trimSpaces(all, s1, s2) {
                // WebKit &nbsp; meant to preserve multiple spaces but instead inserted around all inline tags,
                // including the spans with inline styles created on paste
                if (!s1 && !s2) {
                    return ' ';
                }

                return '\u00a0';
            }

            html = filter(getInnerFragment(html), [
                /^[\s\S]*<body[^>]*>\s*|\s*<\/body[^>]*>[\s\S]*$/g, // Remove anything but the contents within the BODY element
                /<!--StartFragment-->|<!--EndFragment-->/g, // Inner fragments (tables from excel on mac)
                [/( ?)<span class="Apple-converted-space">\u00a0<\/span>( ?)/g, trimSpaces],
                /<br class="Apple-interchange-newline">/g,
                /<br>$/i // Trailing BR elements
            ]);

            return html;
        }

        // TODO: Should be in some global class
        function createIdGenerator(prefix) {
            var count = 0;

            return function () {
                return prefix + (count++);
            };
        }

        return {
            filter: filter,
            innerText: innerText,
            trimHtml: trimHtml,
            createIdGenerator: createIdGenerator
        };
    }();

    var InternalHtml = function () {
        var internalMimeType = 'x-tinymce/html';
        var internalMark = '<!-- ' + internalMimeType + ' -->';

        var mark = function (html) {
            return internalMark + html;
        };

        var unmark = function (html) {
            return html.replace(internalMark, '');
        };

        var isMarked = function (html) {
            return html.indexOf(internalMark) !== -1;
        };

        return {
            mark: mark,
            unmark: unmark,
            isMarked: isMarked,
            internalHtmlMime: function () {
                return internalMimeType;
            }
        };
    }();

    var Newlines = function () {

        var isPlainText = function (text) {
            // so basically any tag that is not one of the "p, div, br", or is one of them, but is followed
            // by some additional characters qualifies the text as not a plain text (having some HTML tags)
            return !/<(?:(?!\/?(?:div|p|br))[^>]*|(?:div|p|br)\s+\w[^>]+)>/.test(text);
        };

        var toBRs = function (text) {
            return text.replace(/\r?\n/g, '<br>');
        };

        var openContainer = function (rootTag, rootAttrs) {
            var key, attrs = [];
            var tag = '<' + rootTag;

            if (typeof rootAttrs === 'object') {
                for (key in rootAttrs) {
                    if (rootAttrs.hasOwnProperty(key)) {
                        attrs.push(key + '="' + Entities.encodeAllRaw(rootAttrs[key]) + '"');
                    }
                }

                if (attrs.length) {
                    tag += ' ' + attrs.join(' ');
                }
            }
            return tag + '>';
        };

        var toBlockElements = function (text, rootTag, rootAttrs) {
            var pieces = text.split(/\r?\n/);
            var i = 0,
                len = pieces.length;
            var stack = [];
            var blocks = [];
            var tagOpen = openContainer(rootTag, rootAttrs);
            var tagClose = '</' + rootTag + '>';
            var isLast, newlineFollows, isSingleNewline;

            // if single-line text then nothing to do
            if (pieces.length === 1) {
                return text;
            }

            for (; i < len; i++) {
                isLast = i === len - 1;
                newlineFollows = !isLast && !pieces[i + 1];
                isSingleNewline = !pieces[i] && !stack.length;

                stack.push(pieces[i] ? pieces[i] : '&nbsp;');

                if (isLast || newlineFollows || isSingleNewline) {
                    blocks.push(stack.join('<br>'));
                    stack = [];
                }

                if (newlineFollows) {
                    i++; // extra progress for extra newline
                }
            }

            return blocks.length === 1 ? blocks[0] : tagOpen + blocks.join(tagClose + tagOpen) + tagClose;
        };

        var convert = function (text, rootTag, rootAttrs) {
            return rootTag ? toBlockElements(text, rootTag, rootAttrs) : toBRs(text);
        };

        return {
            isPlainText: isPlainText,
            convert: convert,
            toBRs: toBRs,
            toBlockElements: toBlockElements
        };
    }();

    function Quirks(editor) {
        function addPreProcessFilter(filterFunc) {
            editor.onBeforePastePreProcess.add(function (e) {
                e.content = filterFunc(e.content);
            });
        }

        function addPostProcessFilter(filterFunc) {
            editor.onPastePostProcess.add(function (e) {
                filterFunc(e.node);
            });
        }

        /**
         * Removes BR elements after block elements. IE9 has a nasty bug where it puts a BR element after each
         * block element when pasting from word. This removes those elements.
         *
         * This:
         *  <p>a</p><br><p>b</p>
         *
         * Becomes:
         *  <p>a</p><p>b</p>
         */
        function removeExplorerBrElementsAfterBlocks(html) {            
            var wordFilter = new WordFilter(editor);
            
            // Only filter word specific content
            if (!wordFilter.isWordContent(editor, html)) {
                return html;
            }

            // Produce block regexp based on the block elements in schema
            var blockElements = [];

            each(editor.schema.getBlockElements(), function (block, blockName) {
                blockElements.push(blockName);
            });

            var explorerBlocksRegExp = new RegExp(
                '(?:<br>&nbsp;[\\s\\r\\n]+|<br>)*(<\\/?(' + blockElements.join('|') + ')[^>]*>)(?:<br>&nbsp;[\\s\\r\\n]+|<br>)*',
                'g'
            );

            // Remove BR:s from: <BLOCK>X</BLOCK><BR>
            html = Utils.filter(html, [
                [explorerBlocksRegExp, '$1']
            ]);

            // IE9 also adds an extra BR element for each soft-linefeed and it also adds a BR for each word wrap break
            html = Utils.filter(html, [
                [/<br><br>/g, '<BR><BR>'], // Replace multiple BR elements with uppercase BR to keep them intact
                [/<br>/g, ' '], // Replace single br elements with space since they are word wrap BR:s
                [/<BR><BR>/g, '<br>'] // Replace back the double brs but into a single BR
            ]);

            return html;
        }

        /**
         * WebKit has a nasty bug where the all computed styles gets added to style attributes when copy/pasting contents.
         * This fix solves that by simply removing the whole style attribute.
         *
         * The paste_webkit_styles option can be set to specify what to keep:
         *  paste_webkit_styles: "none" // Keep no styles
         *  paste_webkit_styles: "all", // Keep all of them
         *  paste_webkit_styles: "font-weight color" // Keep specific ones
         *
         * @param {String} content Content that needs to be processed.
         * @return {String} Processed contents.
         */
        function removeWebKitStyles(content) {
            // Passthrough all styles from Word and let the WordFilter handle that junk
            if (WordFilter.isWordContent(content)) {
                return content;
            }

            // Filter away styles that isn't matching the target node
            var webKitStyles = editor.settings.paste_webkit_styles;

            if (editor.settings.paste_remove_styles_if_webkit === false || webKitStyles == "all") {
                return content;
            }

            if (webKitStyles) {
                webKitStyles = webKitStyles.split(/[, ]/);
            }

            // Keep specific styles that doesn't match the current node computed style
            if (webKitStyles) {
                var dom = editor.dom,
                    node = editor.selection.getNode();

                content = content.replace(/(<[^>]+) style="([^"]*)"([^>]*>)/gi, function (all, before, value, after) {
                    var inputStyles = dom.parseStyle(value, 'span'),
                        outputStyles = {};

                    if (webKitStyles === "none") {
                        return before + after;
                    }

                    for (var i = 0; i < webKitStyles.length; i++) {
                        var inputValue = inputStyles[webKitStyles[i]],
                            currentValue = dom.getStyle(node, webKitStyles[i], true);

                        if (/color/.test(webKitStyles[i])) {
                            inputValue = dom.toHex(inputValue);
                            currentValue = dom.toHex(currentValue);
                        }

                        if (currentValue != inputValue) {
                            outputStyles[webKitStyles[i]] = inputValue;
                        }
                    }

                    outputStyles = dom.serializeStyle(outputStyles, 'span');
                    if (outputStyles) {
                        return before + ' style="' + outputStyles + '"' + after;
                    }

                    return before + after;
                });
            } else {
                // Remove all external styles
                content = content.replace(/(<[^>]+) style="([^"]*)"([^>]*>)/gi, '$1$3');
            }

            // Keep internal styles
            content = content.replace(/(<[^>]+) data-mce-style="([^"]+)"([^>]*>)/gi, function (all, before, value, after) {
                return before + ' style="' + value + '"' + after;
            });

            return content;
        }

        function removeUnderlineAndFontInAnchor(root) {
            editor.dom.select('a font, a u', root).each(function (i, node) {
                editor.dom.remove(node, true);
            });
        }

        // Sniff browsers and apply fixes since we can't feature detect
        if (tinymce.isWebKit) {
            addPreProcessFilter(removeWebKitStyles);
        }

        if (tinymce.isIE) {
            addPreProcessFilter(removeExplorerBrElementsAfterBlocks);
            addPostProcessFilter(removeUnderlineAndFontInAnchor);
        }
    }

    function CutCopy(editor) {
        var noop = function () {};

        var setHtml5Clipboard = function (clipboardData, html, text) {
            if (clipboardData !== undefined && typeof clipboardData.setData === 'function') {
                try {
                    clipboardData.setData('text/html', html);
                    clipboardData.setData('text/plain', text);
                    clipboardData.setData(InternalHtml.internalHtmlMime(), html);
                    return true;
                } catch (e) {
                    return false;
                }
            } else {
                return false;
            }
        };

        var setClipboardData = function (evt, data, fallback, done) {
            if (setHtml5Clipboard(evt.clipboardData, data.html, data.text)) {
                evt.preventDefault();
                done();
            } else {
                fallback(data.html, done);
            }
        };

        var fallback = function (editor) {
            return function (html, done) {
                var markedHtml = InternalHtml.mark(html);
                var div = editor.dom.create('div', {}, markedHtml);
                editor.dom.setStyles(div, {
                    position: 'fixed',
                    left: '-3000px',
                    width: '1000px',
                    overflow: 'hidden'
                });
                editor.dom.add(editor.getBody(), div);

                var range = editor.selection.getRng();
                var offscreenRange = editor.dom.createRng();
                offscreenRange.selectNodeContents(div);
                editor.selection.setRng(offscreenRange);

                setTimeout(function () {
                    div.parentNode.removeChild(div);
                    editor.selection.setRng(range);
                    done();
                }, 0);
            };
        };

        var getData = function (editor) {
            return {
                html: editor.selection.getContent(),
                text: editor.selection.getContent({
                    format: 'text'
                })
            };
        };

        var cut = function (editor) {
            return function (evt) {
                if (editor.selection.isCollapsed() === false) {
                    setClipboardData(evt, getData(editor), fallback(editor), function () {
                        editor.execCommand('Delete');
                    });
                }
            };
        };

        var copy = function (editor) {
            return function (evt) {
                if (editor.selection.isCollapsed() === false) {
                    setClipboardData(evt, getData(editor), fallback(editor), noop);
                }
            };
        };

        var register = function (editor) {
            editor.onCut = new tinymce.util.Dispatcher(this);
            editor.onCopy = new tinymce.util.Dispatcher(this);

            editor.onCut.add(cut(editor));
            editor.onCopy.add(copy(editor));
        };

        return {
            register: register
        };
    }

    function insertContent(editor, html) {
        // remove empty paragraphs
        if (editor.getParam('clipboard_paste_remove_empty_paragraphs', true)) {
            html = html.replace(/<p([^>]+)>(&nbsp;|\u00a0)?<\/p>/g, '');
        }

        // process regular expression
        if (editor.getParam('clipboard_paste_filter')) {
            var re, rules = editor.getParam('clipboard_paste_filter').split(';');

            each(rules, function (s) {
                // if it is already in Regular Expression format...
                if (/^\/.*\/(g|i|m)*$/.test(s)) {
                    re = (new Function('return ' + s))();
                    // ...else create expression
                } else {
                    re = new RegExp(s);
                }

                html = html.replace(re, "");
            });
        }

        editor.execCommand('mceInsertContent', false, html, {
            skip_undo: false
        });
    }

    function Clipboard(editor) {
        var self = this,
            pasteBinElm, lastRng, keyboardPasteTimeStamp = 0,
            draggingInternally = false;
        var pasteBinDefaultContent = '%MCEPASTEBIN%',
            keyboardPastePlainTextState;
        var mceInternalUrlPrefix = 'data:text/mce-internal,';
        var uniqueId = Utils.createIdGenerator("mceclip");

        /**
         * Pastes the specified HTML. This means that the HTML is filtered and then
         * inserted at the current selection in the editor. It will also fire paste events
         * for custom user filtering.
         *
         * @param {String} html HTML code to paste into the current selection.
         * @param {Boolean?} internalFlag Optional true/false flag if the contents is internal or external.
         */
        function pasteHtml(html, internalFlag) {
            var args, dom = editor.dom,
                internal;

            internal = internalFlag || InternalHtml.isMarked(html);
            html = InternalHtml.unmark(html);

            var args = {
                content: html,
                internal: internal
            };

            // Internal event used by Quirks
            editor.onBeforePastePreProcess.dispatch(args);

            editor.onPastePreProcess.dispatch(args);

            html = args.content;

            // User has bound PastePostProcess events then we need to pass it through a DOM node
            // This is not ideal but we don't want to let the browser mess up the HTML for example
            // some browsers add &nbsp; to P tags etc
            if (editor.onPastePostProcess) {
                // We need to attach the element to the DOM so Sizzle selectors work on the contents
                var tempBody = dom.add(editor.getBody(), 'div', {
                    style: 'display:none'
                }, html);

                args = {
                    node: tempBody,
                    internal: internal
                };

                editor.onPastePostProcess.dispatch(self, args);

                dom.remove(tempBody);
                html = args.node.innerHTML;
            }

            insertContent(editor, html);
        }

        /**
         * Pastes the specified text. This means that the plain text is processed
         * and converted into BR and P elements. It will fire paste events for custom filtering.
         *
         * @param {String} text Text to paste as the current selection location.
         */
        function pasteText(text) {
            text = editor.dom.encode(text).replace(/\r\n/g, '\n');
            text = Newlines.convert(text, editor.settings.forced_root_block, editor.settings.forced_root_block_attrs);

            pasteHtml(text, false);
        }

        /**
         * Creates a paste bin element as close as possible to the current caret location and places the focus inside that element
         * so that when the real paste event occurs the contents gets inserted into this element
         * instead of the current editor selection element.
         */
        function createPasteBin() {
            var dom = editor.dom,
                body = editor.getBody();
            var viewport = editor.dom.getViewPort(editor.getWin()),
                scrollTop = viewport.y,
                top = 20;
            var scrollContainer;

            lastRng = editor.selection.getRng();

            if (editor.inline) {
                scrollContainer = editor.selection.getScrollContainer();

                // Can't always rely on scrollTop returning a useful value.
                // It returns 0 if the browser doesn't support scrollTop for the element or is non-scrollable
                if (scrollContainer && scrollContainer.scrollTop > 0) {
                    scrollTop = scrollContainer.scrollTop;
                }
            }

            /**
             * Returns the rect of the current caret if the caret is in an empty block before a
             * BR we insert a temporary invisible character that we get the rect this way we always get a proper rect.
             *
             * TODO: This might be useful in core.
             */
            function getCaretRect(rng) {
                var rects, textNode, node, container = rng.startContainer;

                rects = rng.getClientRects();
                if (rects.length) {
                    return rects[0];
                }

                if (!rng.collapsed || container.nodeType != 1) {
                    return;
                }

                node = container.childNodes[lastRng.startOffset];

                // Skip empty whitespace nodes
                while (node && node.nodeType == 3 && !node.data.length) {
                    node = node.nextSibling;
                }

                if (!node) {
                    return;
                }

                // Check if the location is |<br>
                // TODO: Might need to expand this to say |<table>
                if (node.tagName == 'BR') {
                    textNode = dom.doc.createTextNode('\uFEFF');
                    node.parentNode.insertBefore(textNode, node);

                    rng = dom.createRng();
                    rng.setStartBefore(textNode);
                    rng.setEndAfter(textNode);

                    rects = rng.getClientRects();
                    dom.remove(textNode);
                }

                if (rects.length) {
                    return rects[0];
                }
            }

            // Calculate top cordinate this is needed to avoid scrolling to top of document
            // We want the paste bin to be as close to the caret as possible to avoid scrolling
            if (lastRng.getClientRects) {
                var rect = getCaretRect(lastRng);

                if (rect) {
                    // Client rects gets us closes to the actual
                    // caret location in for example a wrapped paragraph block
                    top = scrollTop + (rect.top - dom.getPos(body).y);
                } else {
                    top = scrollTop;

                    // Check if we can find a closer location by checking the range element
                    var container = lastRng.startContainer;
                    if (container) {
                        if (container.nodeType == 3 && container.parentNode != body) {
                            container = container.parentNode;
                        }

                        if (container.nodeType == 1) {
                            top = dom.getPos(container, scrollContainer || body).y;
                        }
                    }
                }
            }

            // Create a pastebin
            pasteBinElm = dom.add(editor.getBody(), 'div', {
                id: "mcepastebin",
                contentEditable: true,
                "data-mce-bogus": "all",
                style: 'position: absolute; top: ' + top + 'px;' +
                    'width: 10px; height: 10px; overflow: hidden; opacity: 0'
            }, pasteBinDefaultContent);

            // Move paste bin out of sight since the controlSelection rect gets displayed otherwise on IE and Gecko
            if (tinymce.isIE || tinymce.isGecko) {
                dom.setStyle(pasteBinElm, 'left', dom.getStyle(body, 'direction', true) == 'rtl' ? 0xFFFF : -0xFFFF);
            }

            // Prevent focus events from bubbeling fixed FocusManager issues
            dom.bind(pasteBinElm, 'beforedeactivate focusin focusout', function (e) {
                e.stopPropagation();
            });

            pasteBinElm.focus();
            editor.selection.select(pasteBinElm, true);
        }

        /**
         * Removes the paste bin if it exists.
         */
        function removePasteBin() {
            if (pasteBinElm) {
                var pasteBinClone;

                // WebKit/Blink might clone the div so
                // lets make sure we remove all clones
                // TODO: Man o man is this ugly. WebKit is the new IE! Remove this if they ever fix it!
                while ((pasteBinClone = editor.dom.get('mcepastebin'))) {
                    editor.dom.remove(pasteBinClone);
                    editor.dom.unbind(pasteBinClone);
                }

                if (lastRng) {
                    editor.selection.setRng(lastRng);
                }
            }

            pasteBinElm = lastRng = null;
        }

        /**
         * Returns the contents of the paste bin as a HTML string.
         *
         * @return {String} Get the contents of the paste bin.
         */
        function getPasteBinHtml() {
            var html = '',
                pasteBinClones, i, clone, cloneHtml;

            // Since WebKit/Chrome might clone the paste bin when pasting
            // for example: <img style="float: right"> we need to check if any of them contains some useful html.
            // TODO: Man o man is this ugly. WebKit is the new IE! Remove this if they ever fix it!
            pasteBinClones = editor.dom.select('div[id=mcepastebin]');
            for (i = 0; i < pasteBinClones.length; i++) {
                clone = pasteBinClones[i];

                // Pasting plain text produces pastebins in pastebinds makes sence right!?
                if (clone.firstChild && clone.firstChild.id == 'mcepastebin') {
                    clone = clone.firstChild;
                }

                cloneHtml = clone.innerHTML;
                if (html != pasteBinDefaultContent) {
                    html += cloneHtml;
                }
            }

            return html;
        }

        /**
         * Gets various content types out of a datatransfer object.
         *
         * @param {DataTransfer} dataTransfer Event fired on paste.
         * @return {Object} Object with mime types and data for those mime types.
         */
        function getDataTransferItems(dataTransfer) {
            var items = {};

            if (dataTransfer) {
                // Use old WebKit/IE API
                if (dataTransfer.getData) {
                    var legacyText = dataTransfer.getData('Text');
                    if (legacyText && legacyText.length > 0) {
                        if (legacyText.indexOf(mceInternalUrlPrefix) == -1) {
                            items['text/plain'] = legacyText;
                        }
                    }
                }

                if (dataTransfer.types) {
                    for (var i = 0; i < dataTransfer.types.length; i++) {
                        var contentType = dataTransfer.types[i];
                        items[contentType] = dataTransfer.getData(contentType);
                    }
                }
            }

            return items;
        }

        /**
         * Gets various content types out of the Clipboard API. It will also get the
         * plain text using older IE and WebKit API:s.
         *
         * @param {ClipboardEvent} clipboardEvent Event fired on paste.
         * @return {Object} Object with mime types and data for those mime types.
         */
        function getClipboardContent(clipboardEvent) {
            return getDataTransferItems(clipboardEvent.clipboardData || editor.getDoc().dataTransfer);
        }

        function hasHtmlOrText(content) {
            return hasContentType(content, 'text/html') || hasContentType(content, 'text/plain');
        }

        function getBase64FromUri(uri) {
            var idx;

            idx = uri.indexOf(',');
            if (idx !== -1) {
                return uri.substr(idx + 1);
            }

            return null;
        }

        function isValidDataUriImage(settings, imgElm) {
            return settings.images_dataimg_filter ? settings.images_dataimg_filter(imgElm) : true;
        }

        function pasteImage(rng, reader, blob) {
            if (rng) {
                editor.selection.setRng(rng);
                rng = null;
            }

            var dataUri = reader.result;
            var base64 = getBase64FromUri(dataUri);

            var img = new Image();
            img.src = dataUri;

            // TODO: Move the bulk of the cache logic to EditorUpload
            if (isValidDataUriImage(editor.settings, img)) {
                var blobCache = editor.editorUpload.blobCache;
                var blobInfo, existingBlobInfo;

                existingBlobInfo = blobCache.findFirst(function (cachedBlobInfo) {
                    return cachedBlobInfo.base64() === base64;
                });

                if (!existingBlobInfo) {
                    blobInfo = blobCache.create(uniqueId(), blob, base64);
                    blobCache.add(blobInfo);
                } else {
                    blobInfo = existingBlobInfo;
                }

                pasteHtml('<img src="' + blobInfo.blobUri() + '">', false);
            } else {
                pasteHtml('<img src="' + dataUri + '">', false);
            }
        }

        /**
         * Checks if the clipboard contains image data if it does it will take that data
         * and convert it into a data url image and paste that image at the caret location.
         *
         * @param  {ClipboardEvent} e Paste/drop event object.
         * @param  {DOMRange} rng Rng object to move selection to.
         * @return {Boolean} true/false if the image data was found or not.
         */
        function pasteImageData(e, rng) {
            var dataTransfer = e.clipboardData || e.dataTransfer;

            function processItems(items) {
                var i, item, reader, hadImage = false;

                if (items) {
                    for (i = 0; i < items.length; i++) {
                        item = items[i];

                        if (/^image\/(jpeg|png|gif|bmp)$/.test(item.type)) {
                            var blob = item.getAsFile ? item.getAsFile() : item;

                            reader = new FileReader();
                            reader.onload = pasteImage.bind(null, rng, reader, blob);
                            reader.readAsDataURL(blob);

                            e.preventDefault();
                            hadImage = true;
                        }
                    }
                }

                return hadImage;
            }

            if (editor.settings.paste_data_images && dataTransfer) {
                return processItems(dataTransfer.items) || processItems(dataTransfer.files);
            }
        }

        /**
         * Chrome on Android doesn't support proper clipboard access so we have no choice but to allow the browser default behavior.
         *
         * @param {Event} e Paste event object to check if it contains any data.
         * @return {Boolean} true/false if the clipboard is empty or not.
         */
        function isBrokenAndroidClipboardEvent(e) {
            var clipboardData = e.clipboardData;

            return navigator.userAgent.indexOf('Android') != -1 && clipboardData && clipboardData.items && clipboardData.items.length === 0;
        }

        function getCaretRangeFromEvent(e) {
            return RangeUtils.getCaretRangeFromPoint(e.clientX, e.clientY, editor.getDoc());
        }

        function hasContentType(clipboardContent, mimeType) {
            return mimeType in clipboardContent && clipboardContent[mimeType].length > 0;
        }

        function isKeyboardPasteEvent(e) { 
            return (VK.metaKeyPressed(e) && e.keyCode == 86) || (e.shiftKey && e.keyCode == 45);
        }

        function registerEventHandlers() {
            editor.onKeyDown.add(function (editor, e) {                
                function removePasteBinOnKeyUp(e) {
                    // Ctrl+V or Shift+Insert
                    if (isKeyboardPasteEvent(e) && !e.isDefaultPrevented()) {
                        removePasteBin();
                    }
                }

                // Ctrl+V or Shift+Insert
                if (isKeyboardPasteEvent(e) && !e.isDefaultPrevented()) {
                    keyboardPastePlainTextState = e.shiftKey && e.keyCode == 86;

                    // Edge case on Safari on Mac where it doesn't handle Cmd+Shift+V correctly
                    // it fires the keydown but no paste or keyup so we are left with a paste bin
                    if (keyboardPastePlainTextState && tinymce.isWebKit && navigator.userAgent.indexOf('Version/') != -1) {
                        return;
                    }

                    // Prevent undoManager keydown handler from making an undo level with the pastebin in it
                    e.stopImmediatePropagation();

                    keyboardPasteTimeStamp = new Date().getTime();

                    // IE doesn't support Ctrl+Shift+V and it doesn't even produce a paste event
                    // so lets fake a paste event and let IE use the execCommand/dataTransfer methods
                    if (tinymce.isIE && keyboardPastePlainTextState) {
                        e.preventDefault();
                        editor.onPaste.dispatch({
                            ieFake: true
                        });
                        return;
                    }

                    removePasteBin();
                    createPasteBin();

                    var removePasteBinOnKeyUpCallback = function(editor, e) {
                        removePasteBinOnKeyUp(e);
                    }

                    // Remove pastebin if we get a keyup and no paste event
                    // For example pasting a file in IE 11 will not produce a paste event
                    editor.onKeyUp.add(removePasteBinOnKeyUpCallback, null, {once: true});

                    editor.onPaste.add(function() {
                        editor.onKeyUp.remove(removePasteBinOnKeyUpCallback, null, {once: true});
                    });
                }
            });

            function insertClipboardContent(clipboardContent, isKeyBoardPaste, plainTextMode, internal) {
                var content;

                // Grab HTML from Clipboard API or paste bin as a fallback
                if (hasContentType(clipboardContent, 'text/html')) {
                    content = clipboardContent['text/html'];
                } else {
                    content = getPasteBinHtml();

                    // If paste bin is empty try using plain text mode
                    // since that is better than nothing right
                    if (content == pasteBinDefaultContent) {
                        plainTextMode = true;
                    }
                }

                content = Utils.trimHtml(content);

                // WebKit has a nice bug where it clones the paste bin if you paste from for example notepad
                // so we need to force plain text mode in this case
                if (pasteBinElm && pasteBinElm.firstChild && pasteBinElm.firstChild.id === 'mcepastebin') {
                    plainTextMode = true;
                }

                removePasteBin();

                // If we got nothing from clipboard API and pastebin then we could try the last resort: plain/text
                if (!content.length) {
                    plainTextMode = true;
                }

                // Grab plain text from Clipboard API or convert existing HTML to plain text
                if (plainTextMode) {
                    // Use plain text contents from Clipboard API unless the HTML contains paragraphs then
                    // we should convert the HTML to plain text since works better when pasting HTML/Word contents as plain text
                    if (hasContentType(clipboardContent, 'text/plain') && content.indexOf('</p>') == -1) {
                        content = clipboardContent['text/plain'];
                    } else {
                        content = Utils.innerText(content);
                    }
                }

                // If the content is the paste bin default HTML then it was
                // impossible to get the cliboard data out.
                if (content == pasteBinDefaultContent) {
                    if (!isKeyBoardPaste) {
                        editor.windowManager.alert('Please use Ctrl+V/Cmd+V keyboard shortcuts to paste contents.');
                    }

                    return;
                }

                if (plainTextMode) {
                    pasteText(content);
                } else {
                    pasteHtml(content, internal);
                }
            }

            var getLastRng = function () {
                return lastRng || editor.selection.getRng();
            };

            editor.onPaste.add(function (e) {
                // Getting content from the Clipboard can take some time
                var clipboardTimer = new Date().getTime();
                var clipboardContent = getClipboardContent(e);
                var clipboardDelay = new Date().getTime() - clipboardTimer;

                var isKeyBoardPaste = (new Date().getTime() - keyboardPasteTimeStamp - clipboardDelay) < 1000;
                var plainTextMode = self.pasteFormat == "text" || keyboardPastePlainTextState;
                var internal = hasContentType(clipboardContent, InternalHtml.internalHtmlMime());

                keyboardPastePlainTextState = false;

                if (isBrokenAndroidClipboardEvent(e)) {
                    removePasteBin();
                    return;
                }

                if (!hasHtmlOrText(clipboardContent) && pasteImageData(e, getLastRng())) {
                    removePasteBin();
                    return;
                }

                // Not a keyboard paste prevent default paste and try to grab the clipboard contents using different APIs
                if (!isKeyBoardPaste) {
                    e.preventDefault();
                }

                // Try IE only method if paste isn't a keyboard paste
                if (tinymce.isIE && (!isKeyBoardPaste || e.ieFake) && !hasContentType(clipboardContent, 'text/html')) {
                    createPasteBin();

                    editor.dom.bind(pasteBinElm, 'paste', function (e) {
                        e.stopPropagation();
                    });

                    editor.getDoc().execCommand('Paste', false, null);
                    clipboardContent["text/html"] = getPasteBinHtml();
                }

                // If clipboard API has HTML then use that directly
                if (hasContentType(clipboardContent, 'text/html')) {
                    e.preventDefault();
                    insertClipboardContent(clipboardContent, isKeyBoardPaste, plainTextMode, internal);
                } else {
                    window.setTimeout(function () {
                        insertClipboardContent(clipboardContent, isKeyBoardPaste, plainTextMode, internal);
                    }, 0);
                }
            });

            editor.dom.bind(editor.getDoc(), 'dragstart dragend', function (e) {
                draggingInternally = e.type == 'dragstart';
            });

            function isPlainTextFileUrl(content) {
                var plainTextContent = content['text/plain'];
                return plainTextContent ? plainTextContent.indexOf('file://') === 0 : false;
            }

            editor.dom.bind(editor.getDoc(), 'drop', function (e) {
                var dropContent, rng;

                rng = getCaretRangeFromEvent(e);

                if (e.isDefaultPrevented() || draggingInternally) {
                    return;
                }

                dropContent = getDataTransferItems(e.dataTransfer);
                var internal = hasContentType(dropContent, InternalHtml.internalHtmlMime());

                if ((!hasHtmlOrText(dropContent) || isPlainTextFileUrl(dropContent)) && pasteImageData(e, rng)) {
                    return;
                }

                if (rng && editor.settings.paste_filter_drop !== false) {
                    var content = dropContent['mce-internal'] || dropContent['text/html'] || dropContent['text/plain'];

                    if (content) {
                        e.preventDefault();

                        // FF 45 doesn't paint a caret when dragging in text in due to focus call by execCommand
                        window.setTimeout(function () {
                            editor.undoManager.add();

                            if (dropContent['mce-internal']) {
                                editor.execCommand('Delete');
                            }

                            editor.selection.setRng(rng);

                            content = trimHtml(content);

                            if (!dropContent['text/html']) {
                                pasteText(content);
                            } else {
                                pasteHtml(content, internal);
                            }
                        }, 0);
                    }
                }
            });

            editor.dom.bind(editor.getDoc(), 'dragover dragend', function (e) {
                if (editor.settings.paste_data_images) {
                    e.preventDefault();
                }
            });
        }

        self.pasteHtml = pasteHtml;
        self.pasteText = pasteText;
        self.pasteImageData = pasteImageData;

        editor.onPreInit.add(function () {
            registerEventHandlers();

            // Remove all data images from paste for example from Gecko
            // except internal images like video elements
            editor.parser.addNodeFilter('img', function (nodes, name, args) {
                function isPasteInsert(args) {
                    return args.data && args.data.paste === true;
                }

                function remove(node) {
                    if (!node.attr('data-mce-object') && src !== Env.transparentSrc) {
                        node.remove();
                    }
                }

                function isWebKitFakeUrl(src) {
                    return src.indexOf("webkit-fake-url") === 0;
                }

                function isDataUri(src) {
                    return src.indexOf("data:") === 0;
                }

                if (!editor.settings.paste_data_images && isPasteInsert(args)) {
                    var i = nodes.length;

                    while (i--) {
                        var src = nodes[i].attributes.map.src;

                        if (!src) {
                            continue;
                        }

                        // Safari on Mac produces webkit-fake-url see: https://bugs.webkit.org/show_bug.cgi?id=49141
                        if (isWebKitFakeUrl(src)) {
                            remove(nodes[i]);
                        } else if (!editor.settings.allow_html_data_urls && isDataUri(src)) {
                            remove(nodes[i]);
                        }
                    }
                }
            });
        });
    }

    /**
     * Process style attributes
     * @param node Node to process
     */
    function processStyles(editor, node) {
        var dom = editor.dom;

        // Process style information
        var s = editor.getParam('clipboard_paste_retain_style_properties');

        // split to array if string
        if (s && tinymce.is(s, 'string')) {
            styleProps = tinymce.explode(s);

            each(styleProps, function (style, i) {
                if (style === "border") {
                    // add expanded border styles
                    styleProps = styleProps.concat(borderStyles);
                    return true;
                }
            });
        }

        // Retains some style properties
        each(dom.select('*[style]', node), function (n) {
            var ns = {},
                x = 0;

            // get styles on element
            var styles = dom.parseStyle(n.style.cssText);

            // check style against styleProps array
            each(styles, function (v, k) {
                if (tinymce.inArray(styleProps, k) != -1) {
                    ns[k] = v;
                    x++;
                }
            });

            // Remove all of the existing styles
            dom.setAttrib(n, 'style', '');

            if (x > 0) {
                dom.setStyles(n, ns); // Add back the stored subset of styles
            } else {
                // Remove empty span tags that do not have class attributes
                if (n.nodeName == 'SPAN' && !n.className) {
                    dom.remove(n, true);
                }
            }
            // We need to compress the styles on WebKit since if you paste <img border="0" /> it will become <img border="0" style="... lots of junk ..." />
            // Removing the mce_style that contains the real value will force the Serializer engine to compress the styles
            if (tinymce.isWebKit) {
                n.removeAttribute('data-mce-style');
            }
        });

        // convert some attributes
        each(dom.select('*[align]', node), function (el) {
            var v = dom.getAttrib(el, 'align');

            if (v === "left" || v === "right" || v === "center") {
                if (/(IFRAME|IMG|OBJECT|VIDEO|AUDIO|EMBED)/i.test(el.nodeName)) {
                    if (v === "center") {
                        dom.setStyles(el, {
                            'margin': 'auto',
                            'display': 'block'
                        });
                    } else {
                        dom.setStyle(el, 'float', v);
                    }
                } else {
                    dom.setStyle(el, 'text-align', v);
                }
            }

            el.removeAttribute('align');
        });
    }

    function convertToPixels(v) {
        // retun integer 0 for 0 values, eg: 0cm, 0pt etc. 
        if (parseInt(v, 10) === 0) {
            return 0;
        }

        // convert pt to px
        if (v.indexOf('pt') !== -1) {
            // convert to integer
            v = parseInt(v, 10);
            // convert to pixel value (round up to 1)
            v = Math.ceil(v / 1.33333);
            // convert to absolute integer
            v = Math.abs(v);
        }

        return v;
    }

    function WordFilter(editor) {
        // Open Office
        var ooRe = /(Version:[\d\.]+)\s*?((Start|End)(HTML|Fragment):[\d]+\s*?){4}/;

        function isWordContent(editor, content) {
            // force word cleanup
            if (editor.settings.clipboard_paste_force_cleanup) {
                return true;
            }

            // Open Office
            if (/(content=\"OpenOffice.org[^\"]+\")/i.test(content) || ooRe.test(content)) {
                return true; // Mark the pasted contents as word specific content
            }

            // Word
            /*if (/(class=\"?Mso|style=\"[^\"]*\bmso\-|w:WordDocument)/.test(content)) {
               return true;
            }*/

            // Word
            return (
                (/<font face="Times New Roman"|class="?Mso|style="[^"]*\bmso-|style='[^'']*\bmso-|w:WordDocument/i).test(content) ||
                (/class="OutlineElement/).test(content) ||
                (/id="?docs\-internal\-guid\-/.test(content))
            );
        }

        /**
         * Checks if the specified text starts with "1. " or "a. " etc.
         */
        function isNumericList(text) {
            var found = "",
                patterns;

            patterns = {
                'uppper-roman': /^[IVXLMCD]{1,2}\.[ \u00a0]/,
                'lower-roman': /^[ivxlmcd]{1,2}\.[ \u00a0]/,
                'upper-alpha': /^[A-Z]{1,2}[\.\)][ \u00a0]/,
                'lower-alpha': /^[a-z]{1,2}[\.\)][ \u00a0]/,
                'numeric': /^[0-9]+\.[ \u00a0]/,
                'japanese': /^[\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d]+\.[ \u00a0]/,
                'chinese': /^[\u58f1\u5f10\u53c2\u56db\u4f0d\u516d\u4e03\u516b\u4e5d\u62fe]+\.[ \u00a0]/
            };

            /*patterns = [
                /^[IVXLMCD]{1,2}\.[ \u00a0]/, // Roman upper case
                /^[ivxlmcd]{1,2}\.[ \u00a0]/, // Roman lower case
                /^[a-z]{1,2}[\.\)][ \u00a0]/, // Alphabetical a-z
                /^[A-Z]{1,2}[\.\)][ \u00a0]/, // Alphabetical A-Z
                /^[0-9]+\.[ \u00a0]/, // Numeric lists
                /^[\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d]+\.[ \u00a0]/, // Japanese
                /^[\u58f1\u5f10\u53c2\u56db\u4f0d\u516d\u4e03\u516b\u4e5d\u62fe]+\.[ \u00a0]/ // Chinese
            ];*/

            text = text.replace(/^[\u00a0 ]+/, '');

            each(patterns, function (pattern, type) {
                if (pattern.test(text)) {
                    found = type;
                    return false;
                }
            });

            return found;
        }

        function isBulletList(text) {
            return /^[\s\u00a0]*[\u2022\u00b7\u00a7\u25CF]\s*/.test(text);
        }

        var settings = editor.settings;

        editor.onBeforePastePreProcess.add(function (e) {
            var content = e.content,
                retainStyleProperties, validStyles = {};

            // Chrome...
            content = content.replace(/<meta([^>]+)>/, '');

            // Word comments like conditional comments etc
            content = content.replace(/<!--([\s\S]*?)-->/gi, '');

            // remove styles
            content = content.replace(/<style([^>]*)>([\w\W]*?)<\/style>/gi, '');

            // Remove comments, scripts (e.g., msoShowComment), XML tag, VML content, MS Office namespaced tags, and a few other tags
            content = content.replace(/<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|meta|link|\w:\w+)(?=[\s\/>]))[^>]*>/gi, '');

            // Copy paste from Java like Open Office will produce this junk on FF
            content = content.replace(/Version:[\d.]+\nStartHTML:\d+\nEndHTML:\d+\nStartFragment:\d+\nEndFragment:\d+/gi, '');

            // Open Office
            content = Utils.filter(content, [
                [/[\s\S]+?<meta[^>]*>/, ''], // Remove everything before meta element
                [/<!--[\s\S]+?-->/gi, ''], // Comments
                [/<style[^>]*>[\s\S]+?<\/style>/gi, ''] // Remove styles
            ]);

            content = content.replace(ooRe, '', 'g');

            // Remove google docs internal guid markers
            content = content.replace(/<b[^>]+id="?docs-internal-[^>]*>/gi, '');
            content = content.replace(/<br class="?Apple-interchange-newline"?>/gi, '');

            // get retain styles or a subset to allow for text color and table borders
            retainStyleProperties = settings.clipboard_paste_retain_style_properties;

            if (retainStyleProperties) {
                each(retainStyleProperties.split(/[, ]/), function (style) {
                    // add all border styles if "border" is set
                    if (style === "border") {
                        each(borderStyles, function (name) {
                            validStyles[name] = {};
                        });

                        return true;
                    }

                    validStyles[style] = {};
                });
            }

            /**
             * Converts fake bullet and numbered lists to real semantic OL/UL.
             *
             * @param {tinymce.html.Node} node Root node to convert children of.
             */
            function convertFakeListsToProperLists(node) {
                var currentListNode, prevListNode, lastLevel = 1;

                function getText(node) {
                    var txt = '';

                    if (node.type === 3) {
                        return node.value;
                    }

                    if ((node = node.firstChild)) {
                        do {
                            txt += getText(node);
                        } while ((node = node.next));
                    }

                    return txt;
                }

                function trimListStart(node, regExp) {
                    if (node.type === 3) {
                        if (regExp.test(node.value)) {
                            node.value = node.value.replace(regExp, '');
                            return false;
                        }
                    }

                    if ((node = node.firstChild)) {
                        do {
                            if (!trimListStart(node, regExp)) {
                                return false;
                            }
                        } while ((node = node.next));
                    }

                    return true;
                }

                function removeIgnoredNodes(node) {
                    if (node._listIgnore) {
                        node.remove();
                        return;
                    }

                    if ((node = node.firstChild)) {
                        do {
                            removeIgnoredNodes(node);
                        } while ((node = node.next));
                    }
                }

                function convertParagraphToLi(paragraphNode, listName, start, type) {
                    var level = paragraphNode._listLevel || lastLevel;

                    // Handle list nesting
                    if (level != lastLevel) {
                        if (level < lastLevel) {
                            // Move to parent list
                            if (currentListNode) {
                                currentListNode = currentListNode.parent.parent;
                            }
                        } else {
                            // Create new list
                            prevListNode = currentListNode;
                            currentListNode = null;
                        }
                    }

                    if (!currentListNode || currentListNode.name != listName) {
                        prevListNode = prevListNode || currentListNode;
                        currentListNode = new Node(listName, 1);

                        // add list style if any
                        if (type && /roman|alpha/.test(type)) {
                            var style = 'list-style-type:' + type;
                            currentListNode.attr({
                                'style': style,
                                'data-mce-style': style
                            });
                        }

                        if (start > 1) {
                            currentListNode.attr('start', '' + start);
                        }

                        paragraphNode.wrap(currentListNode);
                    } else {
                        currentListNode.append(paragraphNode);
                    }

                    paragraphNode.name = 'li';

                    // Append list to previous list if it exists
                    if (level > lastLevel && prevListNode) {
                        prevListNode.lastChild.append(currentListNode);
                    }

                    lastLevel = level;

                    // Remove start of list item "1. " or "&middot; " etc
                    removeIgnoredNodes(paragraphNode);
                    trimListStart(paragraphNode, /^\u00a0+/);
                    trimListStart(paragraphNode, /^\s*([\u2022\u00b7\u00a7\u25CF]|\w+\.)/);
                    trimListStart(paragraphNode, /^\u00a0+/);
                }

                // Build a list of all root level elements before we start
                // altering them in the loop below.
                var elements = [],
                    child = node.firstChild;
                while (typeof child !== 'undefined' && child !== null) {
                    elements.push(child);

                    child = child.walk();
                    if (child !== null) {
                        while (typeof child !== 'undefined' && child.parent !== node) {
                            child = child.walk();
                        }
                    }
                }

                for (var i = 0; i < elements.length; i++) {
                    node = elements[i];

                    if (node.name == 'p' && node.firstChild) {
                        // Find first text node in paragraph
                        var nodeText = getText(node),
                            type;

                        // Detect unordered lists look for bullets
                        if (isBulletList(nodeText)) {
                            convertParagraphToLi(node, 'ul');
                            continue;
                        }

                        // Detect ordered lists 1., a. or ixv.
                        if (type = isNumericList(nodeText)) {
                            // Parse OL start number
                            var matches = /([0-9]+)\./.exec(nodeText);
                            var start = 1;
                            if (matches) {
                                start = parseInt(matches[1], 10);
                            }

                            convertParagraphToLi(node, 'ol', start, type);
                            continue;
                        }

                        // Convert paragraphs marked as lists but doesn't look like anything
                        if (node._listLevel) {
                            convertParagraphToLi(node, 'ul', 1);
                            continue;
                        }

                        currentListNode = null;
                    } else {
                        // If the root level element isn't a p tag which can be
                        // processed by convertParagraphToLi, it interrupts the
                        // lists, causing a new list to start instead of having
                        // elements from the next list inserted above this tag.
                        prevListNode = currentListNode;
                        currentListNode = null;
                    }
                }
            }

            function filterStyles(node, styleValue) {
                var outputStyles = {},
                    matches, styles = editor.dom.parseStyle(styleValue);

                each(styles, function (value, name) {
                    // Convert various MS styles to W3C styles
                    switch (name) {
                        case 'mso-list':
                            // Parse out list indent level for lists
                            matches = /\w+ \w+([0-9]+)/i.exec(styleValue);
                            if (matches) {
                                node._listLevel = parseInt(matches[1], 10);
                            }

                            // Remove these nodes <span style="mso-list:Ignore">o</span>
                            // Since the span gets removed we mark the text node and the span
                            if (/Ignore/i.test(value) && node.firstChild) {
                                node._listIgnore = true;
                                node.firstChild._listIgnore = true;
                            }

                            break;

                        case "horiz-align":
                            name = "text-align";
                            break;

                        case "vert-align":
                            name = "vertical-align";
                            break;

                        case "font-color":
                        case "mso-foreground":
                        case "color":
                            name = "color";

                            // remove "windowtext"
                            if (value == "windowtext") {
                                value = "";
                            }

                            break;

                        case "mso-background":
                        case "mso-highlight":
                            name = "background";
                            break;

                        case "font-weight":
                        case "font-style":
                            if (value != "normal") {
                                outputStyles[name] = value;
                            }
                            return;

                        case "mso-element":
                            // Remove track changes code
                            if (/^(comment|comment-list)$/i.test(value)) {
                                node.remove();
                                return;
                            }

                            break;
                    }

                    if (name.indexOf('mso-comment') === 0) {
                        node.remove();
                        return;
                    }

                    // Never allow mso- prefixed names
                    if (name.indexOf('mso-') === 0) {
                        return;
                    }

                    // convert to pixel values
                    if (tinymce.inArray(pixelStyles, name) !== -1) {
                        value = convertToPixels(value);
                    }

                    // Output only valid styles
                    if (validStyles && validStyles[name]) {
                        outputStyles[name] = value;
                    }
                });

                // Convert bold style to "b" element
                if (/(bold)/i.test(outputStyles["font-weight"])) {
                    delete outputStyles["font-weight"];
                    node.wrap(new Node("b", 1));
                }

                // Convert italic style to "i" element
                if (/(italic)/i.test(outputStyles["font-style"])) {
                    delete outputStyles["font-style"];
                    node.wrap(new Node("i", 1));
                }

                // Serialize the styles and see if there is something left to keep
                outputStyles = editor.dom.serializeStyle(outputStyles, node.name);

                if (outputStyles) {
                    return outputStyles;
                }

                return null;
            }

            if (settings.paste_enable_default_filters === false) {
                return;
            }

            // Remove basic Word junk
            content = Utils.filter(content, [
                // Word comments like conditional comments etc
                /<!--[\s\S]+?-->/gi,

                // Remove comments, scripts (e.g., msoShowComment), XML tag, VML content,
                // MS Office namespaced tags, and a few other tags
                /<(!|script[^>]*>.*?<\/script(?=[>\s])|\/?(\?xml(:\w+)?|meta|link|style|\w:\w+)(?=[\s\/>]))[^>]*>/gi,

                // Convert <s> into <strike> for line-though
                [/<(\/?)s>/gi, "<$1strike>"],

                // Replace nsbp entites to char since it's easier to handle
                [/&nbsp;/gi, "\u00a0"],

                // Convert <span style="mso-spacerun:yes">___</span> to string of alternating
                // breaking/non-breaking spaces of same length
                [/<span\s+style\s*=\s*"\s*mso-spacerun\s*:\s*yes\s*;?\s*"\s*>([\s\u00a0]*)<\/span>/gi,
                    function (str, spaces) {
                        return (spaces.length > 0) ?
                            spaces.replace(/./, " ").slice(Math.floor(spaces.length / 2)).split("").join("\u00a0") : "";
                    }
                ]
            ]);

            // cleanup table border
            content = content.replace(/<table([^>]+)>/, function ($1, $2) {

                if (settings.schema !== "html4") {
                    $2 = $2.replace(/(border|cell(padding|spacing))="([^"]+)"/gi, '');
                }

                return '<table' + $2 + '>';
            });

            // remove double linebreaks (IE issue?)
            if (settings.forced_root_block) {
                content = content.replace(/<br><br>/gi, '');
            }

            var validElements = settings.paste_word_valid_elements;

            if (!validElements) {
                validElements = (
                    '-strong/b,-em/i,-u,-span,-p,-ol,-ul,-li,-h1,-h2,-h3,-h4,-h5,-h6,' +
                    '-p/div,-a[href|name],img[src|alt|width|height],sub,sup,strike,br,del,table[width],tr,' +
                    'td[colspan|rowspan|width],th[colspan|rowspan|width],thead,tfoot,tbody'
                );
            }

            // Setup strict schema
            var schema = new Schema({
                valid_elements: validElements,
                valid_children: '-li[p]'
            });

            // Add style/class attribute to all element rules since the user might have removed them from
            // paste_word_valid_elements config option and we need to check them for properties
            each(schema.elements, function (rule) {
                /*eslint dot-notation:0*/
                if (!rule.attributes["class"]) {
                    rule.attributes["class"] = {};
                    rule.attributesOrder.push("class");
                }

                if (!rule.attributes.style) {
                    rule.attributes.style = {};
                    rule.attributesOrder.push("style");
                }
            });

            // Parse HTML into DOM structure
            var domParser = new DomParser({}, schema);

            // Filter styles to remove "mso" specific styles and convert some of them
            domParser.addAttributeFilter('style', function (nodes) {
                var i = nodes.length,
                    node;

                while (i--) {
                    node = nodes[i];

                    node.attr('style', filterStyles(node, node.attr('style')));

                    // Remove pointess spans
                    if (node.name == 'span' && node.parent && !node.attributes.length) {
                        node.unwrap();
                    }
                }
            });

            // Check the class attribute for comments or del items and remove those
            domParser.addAttributeFilter('class', function (nodes) {
                var i = nodes.length,
                    node, className;

                while (i--) {
                    node = nodes[i];

                    className = node.attr('class');
                    if (/^(MsoCommentReference|MsoCommentText|msoDel)$/i.test(className)) {
                        node.remove();
                    }

                    node.attr('class', null);
                }
            });

            // Remove all del elements since we don't want the track changes code in the editor
            domParser.addNodeFilter('del', function (nodes) {
                var i = nodes.length;

                while (i--) {
                    nodes[i].remove();
                }
            });

            var footnotes = editor.getParam('clipboard_paste_process_footnotes', 'convert');

            // Keep some of the links and anchors
            domParser.addNodeFilter('a', function (nodes) {
                var i = nodes.length,
                    node, href, name;

                while (i--) {
                    node = nodes[i];
                    href = node.attr('href');
                    name = node.attr('name');

                    if (href && href.indexOf('#_msocom_') != -1) {
                        node.remove();
                        continue;
                    }

                    // convert URL
                    if (href && !name) {
                        href = editor.convertURL(href);
                    }

                    if (href && href.indexOf('file://') === 0) {
                        href = href.split('#')[1];
                        if (href) {
                            href = '#' + href;
                        }
                    }

                    if (!href && !name) {
                        node.unwrap();
                    } else {
                        // Remove all named anchors that aren't specific to TOC, Footnotes or Endnotes
                        if (name && !/^_?(?:toc|edn|ftn)/i.test(name)) {
                            node.unwrap();
                            continue;
                        }

                        // remove footnote
                        if (name && footnotes === "remove") {
                            node.remove();
                            continue;
                        }

                        // unlink footnote
                        if (name && footnotes === "unlink") {
                            node.unwrap();
                            continue;
                        }

                        // set href, remove name
                        node.attr({
                            href: href,
                            name: null
                        });

                        // set appropriate anchor
                        if (settings.schema === "html4") {
                            node.attr('name', name);
                        } else {
                            node.attr('id', name);
                        }
                    }
                }
            });

            // Parse into DOM structure
            var rootNode = domParser.parse(content);

            // Process DOM
            if (settings.paste_convert_word_fake_lists !== false) {
                convertFakeListsToProperLists(rootNode);
            }

            // Serialize DOM back to HTML
            content = new Serializer({
                validate: settings.validate
            }, schema).serialize(rootNode);

            e.content = content;
        });

        this.isWordContent = isWordContent;
    }

    /**
     * Convert URL strings to elements
     * @param content HTML to process
     */
    function convertURLs(ed, content) {

        var ex = '([-!#$%&\'\*\+\\./0-9=?A-Z^_`a-z{|}~]+@[-!#$%&\'\*\+\\/0-9=?A-Z^_`a-z{|}~]+\.[-!#$%&\'*+\\./0-9=?A-Z^_`a-z{|}~]+)';
        var ux = '((news|telnet|nttp|file|http|ftp|https)://[-!#$%&\'\*\+\\/0-9=?A-Z^_`a-z{|}~;]+\.[-!#$%&\'\*\+\\./0-9=?A-Z^_`a-z{|}~;]+)';

        if (ed.getParam('autolink_url', true)) {
            // find and link url if not already linked
            content = content.replace(new RegExp('(=["\']|>)?' + ux, 'g'), function (a, b, c) {
                // only if not already a link, ie: b != =" or >
                if (!b) {
                    return '<a href="' + c + '">' + c + '</a>';
                }

                return a;
            });
        }

        if (ed.getParam('autolink_email', true)) {
            content = content.replace(new RegExp('(=["\']mailto:|>)?' + ex, 'g'), function (a, b, c) {
                // only if not already a mailto: link
                if (!b) {
                    return '<a href="mailto:' + c + '">' + c + '</a>';
                }

                return a;
            });
        }

        return content;
    }

    /**
     * Inserts the specified contents at the caret position.
     */
    function insertContent(editor, content) {

        // remove empty paragraphs
        if (editor.getParam('clipboard_paste_remove_empty_paragraphs', true)) {
            content = content.replace(/<p([^>]+)>(&nbsp;|\u00a0)?<\/p>/g, '');
        }

        // process regular expression
        if (editor.getParam('clipboard_paste_filter')) {
            var re, rules = ed.getParam('clipboard_paste_filter').split(';');

            each(rules, function (s) {
                // if it is already in Regular Expression format...
                if (/^\/.*\/(g|i|m)*$/.test(s)) {
                    re = (new Function('return ' + s))();
                    // ...else create expression
                } else {
                    re = new RegExp(s);
                }

                content = content.replace(re, "");
            });
        }

        editor.execCommand('mceInsertContent', false, content);
    }

    tinymce.create('tinymce.plugins.ClipboardPlugin', {
        init: function (ed, url) {
            var self = this;
            self.editor = ed;

            ed.onBeforePastePreProcess = new Dispatcher(this);
            ed.onPastePreProcess = new Dispatcher(this);
            ed.onPastePostProcess = new Dispatcher(this);

            CutCopy().register(ed);

            self.clipboard = new Clipboard(ed);
            self.quirks = new Quirks(ed);
            self.wordFilter = new WordFilter(ed);

            // set default paste state for dialog trigger
            this.canPaste = false;

            if (ed.settings.paste_preprocess) {
                ed.onPastePreProcess.add(function (ed, e) {
                    ed.settings.paste_preprocess.call(self, self, e);
                });
            }

            if (ed.settings.paste_postprocess) {
                ed.onPastePostProcess.add(function (ed, e) {
                    ed.settings.paste_postprocess.call(self, self, e);
                });
            }

            ed.onPastePreProcess.add(this.preProcess);
            ed.onPastePostProcess.add(this.postProcess);

            ed.addCommand('mceInsertClipboardContent', function (ui, value) {
                if (value.content) {
                    self.clipboard.pasteHtml(value.content, value.internal);
                }

                if (value.text) {
                    self.clipboard.pasteText(value.text);
                }
            });

            self.pasteText = ed.getParam('clipboard_paste_text', 1);
            self.pasteHtml = ed.getParam('clipboard_paste_html', 1);

            ed.onInit.add(function () {
                if (ed.plugins.contextmenu) {
                    ed.plugins.contextmenu.onContextMenu.add(function (th, m, e) {
                        var c = ed.selection.isCollapsed();

                        if (ed.getParam('clipboard_cut', 1)) {
                            m.add({
                                title: 'advanced.cut_desc',
                                /* TODO - Change to clipboard.cut_desc */
                                icon: 'cut',
                                cmd: 'Cut'
                            }).setDisabled(c);
                        }

                        if (ed.getParam('clipboard_copy', 1)) {
                            m.add({
                                title: 'advanced.copy_desc',
                                /* TODO - Change to clipboard.copy_desc */
                                icon: 'copy',
                                cmd: 'Copy'
                            }).setDisabled(c);
                        }

                        if (self.pasteHtml) {
                            m.add({
                                title: 'clipboard.paste_desc',
                                /* TODO - Change to clipboard.paste_desc */
                                icon: 'paste',
                                cmd: 'mcePaste'
                            });
                        }
                        if (self.pasteText) {
                            m.add({
                                title: 'clipboard.paste_text_desc',
                                /* TODO - Change to clipboard.paste_text_desc */
                                icon: 'pastetext',
                                cmd: 'mcePasteText'
                            });
                        }
                    });

                }
            });

            each(['Cut', 'Copy'], function (command) {
                ed.addCommand(command, function () {
                    var doc = ed.getDoc(),
                        failed;

                    // Try executing the native command
                    try {
                        doc.execCommand(command, false, null);
                    } catch (ex) {
                        // Command failed
                        failed = true;
                    }

                    var msg = ed.getLang('clipboard_msg', '');
                    msg = msg.replace(/\%s/g, tinymce.isMac ? 'CMD' : 'CTRL');

                    // Present alert message about clipboard access not being available
                    if (failed || !doc.queryCommandSupported(command)) {
                        if (tinymce.isGecko) {
                            ed.windowManager.confirm(msg, function (state) {
                                if (state) {
                                    open('http://www.mozilla.org/editor/midasdemo/securityprefs.html', '_blank');
                                }
                            });
                        } else {
                            ed.windowManager.alert(ed.getLang('clipboard_no_support'));
                        }
                    }
                });
            });

            // Add commands
            each(['mcePasteText', 'mcePaste'], function (cmd) {
                ed.addCommand(cmd, function () {
                    var doc = ed.getDoc();
                    // set command
                    self.command = cmd;

                    // just open the window
                    if (ed.getParam('clipboard_paste_use_dialog') || (tinymce.isIE && !doc.queryCommandSupported('Paste'))) {
                        return self.openWin(cmd);
                    } else {
                        try {
                            doc.execCommand('Paste', false, null);
                        } catch (e) {
                            self.canPaste = false;
                        }

                        // if paste command not supported open window
                        if (self.canPaste === false) {
                            return self.openWin(cmd);
                        }
                    }
                });

            });

            // Add buttons
            if (self.pasteHtml) {
                ed.addButton('paste', {
                    title: 'clipboard.paste_desc',
                    cmd: 'mcePaste',
                    ui: true
                });
            }

            if (self.pasteText) {
                ed.addButton('pastetext', {
                    title: 'clipboard.paste_text_desc',
                    cmd: 'mcePasteText',
                    ui: true
                });
            }

            if (ed.getParam('clipboard_cut', 1)) {
                ed.addButton('cut', {
                    title: 'advanced.cut_desc',
                    cmd: 'Cut',
                    icon: 'cut'
                });
            }

            if (ed.getParam('clipboard_copy', 1)) {
                ed.addButton('copy', {
                    title: 'advanced.copy_desc',
                    cmd: 'Copy',
                    icon: 'copy'
                });
            }
        },

        openWin: function (cmd) {
            var ed = this.editor;

            ed.windowManager.open({
                file: ed.getParam('site_url') + 'index.php?option=com_jce&view=editor&plugin=clipboard&cmd=' + cmd,
                width: parseInt(ed.getParam("clipboard_paste_dialog_width", "450")),
                height: parseInt(ed.getParam("clipboard_paste_dialog_height", "400")),
                inline: 1,
                popup_css: false
            }, {
                cmd: cmd
            });
        },

        preProcess: function (e) {
            var ed = this.editor,
                content = e.content,
                rb;

            if (ed.settings.paste_enable_default_filters == false) {
                return;
            }

            // Process away some basic content
            content = content.replace(/^\s*(&nbsp;)+/g, ''); // nbsp entities at the start of contents
            content = content.replace(/(&nbsp;|<br[^>]*>)+\s*$/g, ''); // nbsp entities at the end of contents

            // skip plain text
            if (this.plainText) {
                return content;
            }

            // remove attributes
            if (ed.getParam('clipboard_paste_remove_attributes')) {
                var attribs = ed.getParam('clipboard_paste_remove_attributes').split(',');

                content = content.replace(new RegExp(' (' + attribs.join('|') + ')="([^"]+)"', 'gi'), '');
            }

            // replace double linebreaks with paragraphs
            if (rb = ed.getParam('forced_root_block')) {
                var blocks = '';
                // only split if a double break exists
                if (content.indexOf('<br><br>') != -1) {
                    // convert marker to paragraphs
                    tinymce.each(h.split('<br><br>'), function (block) {
                        blocks += '<' + rb + '>' + block + '</' + rb + '>';
                    });

                    content = blocks;
                }
            }

            // Remove all spans (and font, u, strike if inline_styles = true as these would get converted to spans later)
            if (ed.getParam('clipboard_paste_remove_spans')) {
                content = content.replace(/<\/?(u|strike)[^>]*>/gi, '');

                if (ed.settings.convert_fonts_to_spans) {
                    content = content.replace(/<\/?(font)[^>]*>/gi, '');
                }

                content = content.replace(/<\/?(span)[^>]*>/gi, '');
            }

            // replace paragraphs with linebreaks
            if (!ed.getParam('forced_root_block')) {
                // remove empty paragraphs first
                if (ed.getParam('clipboard_paste_remove_empty_paragraphs', true)) {
                    content = content.replace(/<p([^>]*)>(\s|&nbsp;|\u00a0)*<\/p>/gi, '');
                }

                content = content.replace(/<\/(p|div)>/gi, '<br /><br />').replace(/<(p|div)([^>]*)>/g, '').replace(/(<br \/>){2}$/g, '');
            }

            // convert urls in content
            if (ed.getParam('clipboard_paste_convert_urls', true)) {
                content = convertURLs(ed, content);
            }

            // convert some tags if cleanup is off
            if (ed.settings.verify_html === false) {
                content = content.replace(/<b\b([^>]*)>/gi, '<strong$1>');
                content = content.replace(/<\/b>/gi, '</strong>');
            }

            e.content = content;
        },

        /**
         * Paste as Plain Text
         * Remove all html form pasted contents. Newlines will be converted to paragraphs or linebreaks
         */
        insertPlainText: function (h) {
            var ed = this.editor,
                dom = ed.dom,
                rb, entities = null;

            if ((typeof (h) === "string") && (h.length > 0)) {

                // clean any Word specific tags
                h = WordFilter(ed, h);

                // If HTML content with line-breaking tags, then remove all cr/lf chars because only tags will break a line
                if (/<(?:p|br|h[1-6]|ul|ol|dl|table|t[rdh]|div|blockquote|fieldset|pre|address|center)[^>]*>/i.test(h)) {
                    h = h.replace(/[\n\r]+/g, '');
                } else {
                    // Otherwise just get rid of carriage returns (only need linefeeds)
                    h = h.replace(/\r+/g, '');
                }

                h = h.replace(/<\/(?:p|h[1-6]|ul|ol|dl|table|div|blockquote|fieldset|pre|address|center)>/gi, "\n\n"); // Block tags get a blank line after them

                h = h.replace(/<br[^>]*>|<\/tr>/gi, "\n"); // Single linebreak for <br /> tags and table rows
                h = h.replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, "\t"); // Table cells get tabs betweem them

                h = h.replace(/<[a-z!\/?][^>]*>/gi, ''); // Delete all remaining tags
                h = h.replace(/&nbsp;/gi, " "); // Convert non-break spaces to regular spaces (remember, *plain text*)

                // replace HTML entity with actual character
                h = dom.decode(tinymce.html.Entities.encodeRaw(h));

                h = h.replace(/(?:(?!\n)\s)*(\n+)(?:(?!\n)\s)*/gi, "$1"); // Cool little RegExp deletes whitespace around linebreak chars.
                h = h.replace(/\n{3,}/g, "\n\n"); // Max. 2 consecutive linebreaks
                h = h.replace(/^\s+|\s+$/g, ''); // Trim the front & back

                // Perform replacements
                h = h.replace(/\u2026/g, "...");
                h = h.replace(/[\x93\x94]/g, '"');
                h = h.replace(/[\x60\x91\x92]/g, "'");

                if (rb = ed.getParam("forced_root_block")) {
                    // strip whitespace
                    h = h.replace(/^\s+|\s+$/g, '');
                    // replace double linebreaks with paragraphs
                    h = h.replace(/\n\n/g, '</' + rb + '><' + rb + '>');
                }
                // replace single linebreak with br element
                h = h.replace(/\n+?/g, '<br />');

                // remove empty paragraphs
                if (ed.getParam('clipboard_paste_remove_empty_paragraphs', true)) {
                    h = h.replace(/<p>(\s|&nbsp;|\u00a0)?<\/p>/gi, '');
                }
            }

            this._insert(h);
        },

        /**
         * Various post process items.
         */
        postProcess: function (o) {
            var self = this,
                ed = this.editor,
                dom = ed.dom,
                h;

            if (ed.settings.paste_enable_default_filters == false) {
                return;
            }

            // skip if plain text
            if (this.plainText) {
                return;
            }

            // Remove Apple style spans
            each(dom.select('span.Apple-style-span', o.node), function (n) {
                dom.remove(n, 1);
            });

            // Remove all styles
            if (ed.getParam('clipboard_paste_remove_styles')) {
                // Remove style attribute
                each(dom.select('*[style]', o.node), function (el) {
                    el.removeAttribute('style');
                    el.removeAttribute('data-mce-style');
                });
            } else {
                // process style attributes
                processStyles(ed, o.node);
            }

            // fix table borders
            if (self.isWordContent) {
                each(dom.select('table[style], td[style], th[style]', o.node), function (n) {
                    var styles = {};

                    each(borderStyles, function (name) {
                        // process each side, eg: border-left-width
                        if (/-(top|right|bottom|left)-/.test(name)) {
                            // get style
                            var value = dom.getStyle(n, name);

                            // remove default values
                            if (value === "currentcolor") {
                                value = "";
                            }

                            // convert to pixels
                            if (value && /^\d[a-z]?/.test(value)) {
                                value = convertToPixels(value);

                                if (value) {
                                    value += "px";
                                }
                            }

                            styles[name] = value;
                        }
                    });

                    // remove styles with no width value
                    each(styles, function (v, k) {
                        if (k.indexOf('-width') !== -1 && v === "") {
                            var s = k.replace(/-width/, '');
                            delete styles[s + '-style'];
                            delete styles[s + '-color'];
                            delete styles[k];
                        }
                    });

                    // remove borders
                    dom.setStyle(n, 'border', '');

                    // compress and set style
                    dom.setAttrib(n, 'style', dom.serializeStyle(dom.parseStyle(dom.serializeStyle(styles, n.nodeName))), n.nodeName);
                });
            }

            // image file/data regular expression
            var imgRe = /(file:|data:image)\//i,
                uploader = ed.plugins.upload;
            var canUpload = uploader && uploader.plugins.length;

            // Process images - remove local
            each(dom.select('img', o.node), function (el) {
                var s = dom.getAttrib(el, 'src');

                // remove img element if blank, local file url or base64 encoded
                if (!s || imgRe.test(s)) {
                    if (ed.getParam('clipboard_paste_upload_images', true) && canUpload) {
                        // add marker
                        ed.dom.setAttrib(el, 'data-mce-upload-marker', '1');
                    } else {
                        dom.remove(el);
                    }
                } else {
                    dom.setAttrib(el, 'src', ed.convertURL(s));
                }
            });

            // remove font and underline tags in IE
            if (tinymce.isIE) {
                each(dom.select('a', o.node), function (el) {
                    each(dom.select('font,u'), function (n) {
                        dom.remove(n, 1);
                    });
                });
            }

            // remove tags
            if (ed.getParam('clipboard_paste_remove_tags')) {
                dom.remove(dom.select(ed.getParam('clipboard_paste_remove_tags'), o.node), 1);
            }

            // keep tags
            if (ed.getParam('clipboard_paste_keep_tags')) {
                var tags = ed.getParam('clipboard_paste_keep_tags');

                dom.remove(dom.select('*:not(' + tags + ')', o.node), 1);
            }

            // remove all spans
            if (ed.getParam('clipboard_paste_remove_spans')) {
                dom.remove(dom.select('span', o.node), 1);
                // remove empty spans
            } else {
                ed.dom.remove(dom.select('span:empty', o.node));

                each(dom.select('span', o.node), function (n) {
                    // remove span without children eg: <span></span>
                    if (!n.childNodes || n.childNodes.length === 0) {
                        dom.remove(n);
                    }

                    // remove span without attributes
                    if (dom.getAttribs(n).length === 0) {
                        dom.remove(n, 1);
                    }
                });
            }

            if (ed.getParam('clipboard_paste_remove_empty_paragraphs', true)) {
                dom.remove(dom.select('p:empty', o.node));

                each(dom.select('p', o.node), function (n) {
                    var h = n.innerHTML;

                    // remove paragraph without children eg: <p></p>
                    if (!n.childNodes || n.childNodes.length === 0 || /^(\s|&nbsp;|\u00a0)?$/.test(h)) {
                        dom.remove(n);
                    }
                });
            }
        }
    });
    // Register plugin
    tinymce.PluginManager.add('clipboard', tinymce.plugins.ClipboardPlugin);
})();