(function (tinymce, tinyMCEPopup, $) {

    function selectByValue(field_name, value, add_custom, ignore_case) {
        if (!value) {
            value = "";
        }

        var sel = document.getElementById(field_name);

        if (!sel) {
            return;
        }

        var found = false;

        for (var i = 0; i < sel.options.length; i++) {
            var option = sel.options[i];

            if (option.value == value || (ignore_case && option.value.toLowerCase() == value.toLowerCase())) {
                option.selected = true;
                found = true;
            } else
                option.selected = false;
        }

        if (!found && add_custom && value != '') {
            var option = new Option(value, value);
            option.selected = true;
            sel.options[sel.options.length] = option;
            sel.selectedIndex = sel.options.length - 1;
        }

        return found;
    }

    function addSelectValue(field_name, name, value) {        
        var s = document.getElementById(field_name);
        var o = new Option(name, value);
        s.options[s.options.length] = o;
    }

    function getColor(n) {
        var v = $(n).val();

        if (v.indexOf('#') !== -1) {
            return v;
        }

        return '#' + v;
    }

    var StyleDialog = {
        settings: {},
        defaults: {
            'Fonts': "" +
                "Arial, Helvetica, sans-serif=Arial, Helvetica, sans-serif;" +
                "Times New Roman, Times, serif=Times New Roman, Times, serif;" +
                "Courier New, Courier, mono=Courier New, Courier, mono;" +
                "Times New Roman, Times, serif=Times New Roman, Times, serif;" +
                "Georgia, Times New Roman, Times, serif=Georgia, Times New Roman, Times, serif;" +
                "Verdana, Arial, Helvetica, sans-serif=Verdana, Arial, Helvetica, sans-serif;" +
                "Geneva, Arial, Helvetica, sans-serif=Geneva, Arial, Helvetica, sans-serif",
            'Sizes': "9;10;12;14;16;18;24;xx-small;x-small;small;medium;large;x-large;xx-large;smaller;larger",
            'Measurement': "+pixels=px;points=pt;inches=in;centimetres=cm;millimetres=mm;picas=pc;ems=em;exs=ex;%",
            'SpacingMeasurement': "pixels=px;points=pt;inches=in;centimetres=cm;millimetres=mm;picas=pc;+ems=em;exs=ex;%",
            'IndentMeasurement': "pixels=px;+points=pt;inches=in;centimetres=cm;millimetres=mm;picas=pc;ems=em;exs=ex;%",
            'Weight': "normal;bold;bolder;lighter;100;200;300;400;500;600;700;800;900",
            'TextStyle': "normal;italic;oblique",
            'Variant': "normal;small-caps",
            'LineHeight': "normal",
            'Attachment': "fixed;scroll",
            'Repeat': "no-repeat;repeat;repeat-x;repeat-y",
            'PosH': "left;center;right",
            'PosV': "top;center;bottom",
            'VAlign': "baseline;sub;super;top;text-top;middle;bottom;text-bottom",
            'Display': "inline;block;list-item;run-in;compact;marker;table;inline-table;table-row-group;table-header-group;table-footer-group;table-row;table-column-group;table-column;table-cell;table-caption;none",
            'BorderStyle': "none;solid;dashed;dotted;double;groove;ridge;inset;outset",
            'BorderWidth': "thin;medium;thick",
            'ListType': "disc;circle;square;decimal;lower-roman;upper-roman;lower-alpha;upper-alpha;none"
        },
        aggregateStyles: function (allStyles) {
            var mergedStyles = {};

            tinymce.each(allStyles, function (style) {
                if (style !== '') {
                    var parsedStyles = tinyMCEPopup.editor.dom.parseStyle(style);
                    for (var name in parsedStyles) {
                        if (parsedStyles.hasOwnProperty(name)) {
                            if (mergedStyles[name] === undefined) {
                                mergedStyles[name] = parsedStyles[name];
                            } else if (name === 'text-decoration') {
                                if (mergedStyles[name].indexOf(parsedStyles[name]) === -1) {
                                    mergedStyles[name] = mergedStyles[name] + ' ' + parsedStyles[name];
                                }
                            }
                        }
                    }
                }
            });

            return mergedStyles;
        },
        init: function () {
            var self = this,
                ed = tinyMCEPopup.editor,
                ce = document.getElementById('container'),
                h;

            if (!this.settings.file_browser) {
                $('.browser').removeClass('browser');
            }

            this.existingStyles = this.aggregateStyles(tinyMCEPopup.getWindowArg('styles'));

            ce.style.cssText = ed.dom.serializeStyle(this.existingStyles);

            this.applyActionIsInsert = ed.getParam("edit_css_style_insert_span", false);

            $('#insert').click(function (e) {
                e.preventDefault();

                self.updateAction();
            });

            $('#apply').click(function (e) {
                e.preventDefault();

                self.applyAction();
            });

            $('#toggle_insert_span').prop('checked', this.applyActionIsInsert);

            this.fillSelect('text_font', 'style_font', ed.getParam('theme_fonts', this.defaults.Fonts), ';', true);
            this.fillSelect('text_size', 'style_font_size', this.defaults.Sizes, ';', true);
            this.fillSelect('text_size_measurement', 'style_font_size_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('text_case', 'style_text_case', "capitalize;uppercase;lowercase", ';', true);
            this.fillSelect('text_weight', 'style_font_weight', this.defaults.Weight, ';', true);
            this.fillSelect('text_style', 'style_font_style', this.defaults.TextStyle, ';', true);
            this.fillSelect('text_variant', 'style_font_variant', this.defaults.Variant, ';', true);
            this.fillSelect('text_lineheight', 'style_font_line_height', this.defaults.LineHeight, ';', true);
            this.fillSelect('text_lineheight_measurement', 'style_font_line_height_measurement', this.defaults.Measurement, ';', true);

            this.fillSelect('background_attachment', 'style_background_attachment', this.defaults.Attachment, ';', true);
            this.fillSelect('background_repeat', 'style_background_repeat', this.defaults.Repeat, ';', true);

            this.fillSelect('background_hpos_measurement', 'style_background_hpos_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('background_vpos_measurement', 'style_background_vpos_measurement', this.defaults.Measurement, ';', true);

            this.fillSelect('background_hpos', 'style_background_hpos', this.defaults.PosH, ';', true);
            this.fillSelect('background_vpos', 'style_background_vpos', this.defaults.PosV, ';', true);

            this.fillSelect('block_wordspacing', 'style_wordspacing', 'normal', ';', true);
            this.fillSelect('block_wordspacing_measurement', 'style_wordspacing_measurement', this.defaults.SpacingMeasurement, ';', true);
            this.fillSelect('block_letterspacing', 'style_letterspacing', 'normal', ';', true);
            this.fillSelect('block_letterspacing_measurement', 'style_letterspacing_measurement', this.defaults.SpacingMeasurement, ';', true);
            this.fillSelect('block_vertical_alignment', 'style_vertical_alignment', this.defaults.VAlign, ';', true);
            this.fillSelect('block_text_align', 'style_text_align', "left;right;center;justify", ';', true);
            this.fillSelect('block_whitespace', 'style_whitespace', "normal;pre;pre-wrap;pre-line;nowrap", ';', true);
            this.fillSelect('block_display', 'style_display', this.defaults.Display, ';', true);
            this.fillSelect('block_text_indent_measurement', 'style_text_indent_measurement', this.defaults.IndentMeasurement, ';', true);

            this.fillSelect('box_width_measurement', 'style_box_width_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_height_measurement', 'style_box_height_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_float', 'style_float', 'left;right;none', ';', true);
            this.fillSelect('box_clear', 'style_clear', 'left;right;both;none', ';', true);
            this.fillSelect('box_padding_left_measurement', 'style_padding_left_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_padding_top_measurement', 'style_padding_top_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_padding_bottom_measurement', 'style_padding_bottom_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_padding_right_measurement', 'style_padding_right_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_margin_left_measurement', 'style_margin_left_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_margin_top_measurement', 'style_margin_top_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_margin_bottom_measurement', 'style_margin_bottom_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('box_margin_right_measurement', 'style_margin_right_measurement', this.defaults.Measurement, ';', true);

            this.fillSelect('border_style_top', 'style_border_style_top', this.defaults.BorderStyle, ';', true);
            this.fillSelect('border_style_right', 'style_border_style_right', this.defaults.BorderStyle, ';', true);
            this.fillSelect('border_style_bottom', 'style_border_style_bottom', this.defaults.BorderStyle, ';', true);
            this.fillSelect('border_style_left', 'style_border_style_left', this.defaults.BorderStyle, ';', true);

            this.fillSelect('border_width_top', 'style_border_width_top', this.defaults.BorderWidth, ';', true);
            this.fillSelect('border_width_right', 'style_border_width_right', this.defaults.BorderWidth, ';', true);
            this.fillSelect('border_width_bottom', 'style_border_width_bottom', this.defaults.BorderWidth, ';', true);
            this.fillSelect('border_width_left', 'style_border_width_left', this.defaults.BorderWidth, ';', true);

            this.fillSelect('border_width_top_measurement', 'style_border_width_top_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('border_width_right_measurement', 'style_border_width_right_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('border_width_bottom_measurement', 'style_border_width_bottom_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('border_width_left_measurement', 'style_border_width_left_measurement', this.defaults.Measurement, ';', true);

            this.fillSelect('list_type', 'style_list_type', this.defaults.ListType, ';', true);
            this.fillSelect('list_position', 'style_list_position', "inside;outside", ';', true);

            this.fillSelect('positioning_type', 'style_positioning_type', "absolute;relative;static", ';', true);
            this.fillSelect('positioning_visibility', 'style_positioning_visibility', "inherit;visible;hidden", ';', true);

            this.fillSelect('positioning_width_measurement', 'style_positioning_width_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_height_measurement', 'style_positioning_height_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_overflow', 'style_positioning_overflow', "visible;hidden;scroll;auto", ';', true);

            this.fillSelect('positioning_placement_top_measurement', 'style_positioning_placement_top_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_placement_right_measurement', 'style_positioning_placement_right_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_placement_bottom_measurement', 'style_positioning_placement_bottom_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_placement_left_measurement', 'style_positioning_placement_left_measurement', this.defaults.Measurement, ';', true);

            this.fillSelect('positioning_clip_top_measurement', 'style_positioning_clip_top_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_clip_right_measurement', 'style_positioning_clip_right_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_clip_bottom_measurement', 'style_positioning_clip_bottom_measurement', this.defaults.Measurement, ';', true);
            this.fillSelect('positioning_clip_left_measurement', 'style_positioning_clip_left_measurement', this.defaults.Measurement, ';', true);

            this.setupFormData();
            this.showDisabledControls();

            Wf.init();
        },
        setupFormData: function () {
            var ed = tinyMCEPopup.editor,
                ce = document.getElementById('container'),
                s, b, i;

            // Setup text fields

            selectByValue('text_font', ce.style.fontFamily, true, true);
            selectByValue('text_size', this.getNum(ce.style.fontSize), true, true);
            selectByValue('text_size_measurement', this.getMeasurement(ce.style.fontSize));
            selectByValue('text_weight', ce.style.fontWeight, true, true);
            selectByValue('text_style', ce.style.fontStyle, true, true);
            selectByValue('text_lineheight', this.getNum(ce.style.lineHeight), true, true);
            selectByValue('text_lineheight_measurement', this.getMeasurement(ce.style.lineHeight));
            selectByValue('text_case', ce.style.textTransform, true, true);
            selectByValue('text_variant', ce.style.fontVariant, true, true);
            $('#text_color').val(ed.dom.toHex(ce.style.color));

            $('#text_underline').prop('checked', this.inStr(ce.style.textDecoration, 'underline'));
            $('#text_overline').prop('checked', this.inStr(ce.style.textDecoration, 'overline'));
            $('#text_linethrough').prop('checked', this.inStr(ce.style.textDecoration, 'line-through'));
            $('#text_blink').prop('checked', this.inStr(ce.style.textDecoration, 'blink'));

            $('#text_none').prop('checked', this.inStr(ce.style.textDecoration, 'none'));

            this.updateTextDecorations();

            // Setup background fields

            $('#background_color').val(ed.dom.toHex(ce.style.backgroundColor));
            $('#background_image').val(ce.style.backgroundImage.replace(new RegExp("url\\('?([^']*)'?\\)", 'gi'), function (a, b) {
                return ed.convertURL(b);
            }));
            selectByValue('background_repeat', ce.style.backgroundRepeat, true, true);
            selectByValue('background_attachment', ce.style.backgroundAttachment, true, true);
            selectByValue('background_hpos', this.getNum(this.getVal(ce.style.backgroundPosition, 0)), true, true);
            selectByValue('background_hpos_measurement', this.getMeasurement(this.getVal(ce.style.backgroundPosition, 0)));
            selectByValue('background_vpos', this.getNum(this.getVal(ce.style.backgroundPosition, 1)), true, true);
            selectByValue('background_vpos_measurement', this.getMeasurement(this.getVal(ce.style.backgroundPosition, 1)));

            // Setup block fields

            selectByValue('block_wordspacing', this.getNum(ce.style.wordSpacing), true, true);
            selectByValue('block_wordspacing_measurement', this.getMeasurement(ce.style.wordSpacing));
            selectByValue('block_letterspacing', this.getNum(ce.style.letterSpacing), true, true);
            selectByValue('block_letterspacing_measurement', this.getMeasurement(ce.style.letterSpacing));
            selectByValue('block_vertical_alignment', ce.style.verticalAlign, true, true);
            selectByValue('block_text_align', ce.style.textAlign, true, true);
            $('#block_text_indent').val(this.getNum(ce.style.textIndent));
            selectByValue('block_text_indent_measurement', this.getMeasurement(ce.style.textIndent));
            selectByValue('block_whitespace', ce.style.whiteSpace, true, true);
            selectByValue('block_display', ce.style.display, true, true);

            // Setup box fields

            $('#box_width').val(this.getNum(ce.style.width));
            selectByValue('box_width_measurement', this.getMeasurement(ce.style.width));

            $('#box_height').val(this.getNum(ce.style.height));
            selectByValue('box_height_measurement', this.getMeasurement(ce.style.height));

            selectByValue('box_float', ce.style.cssFloat || ce.style.styleFloat, true, true);

            selectByValue('box_clear', ce.style.clear, true, true);

            this.setupBox(ce, 'box_padding', 'padding', '');
            this.setupBox(ce, 'box_margin', 'margin', '');

            // Setup border fields

            this.setupBox(ce, 'border_style', 'border', 'Style');
            this.setupBox(ce, 'border_width', 'border', 'Width');
            this.setupBox(ce, 'border_color', 'border', 'Color');

            $.each(['top', 'right', 'bottom', 'left'], function (i, k) {
                $('#border_color_' + k).val(function () {
                    return ed.dom.toHex(this.value);
                });
            });

            // Setup list fields

            selectByValue('list_type', ce.style.listStyleType, true, true);
            selectByValue('list_position', ce.style.listStylePosition, true, true);
            $('#list_bullet_image').val(ce.style.listStyleImage.replace(new RegExp("url\\('?([^']*)'?\\)", 'gi'), "$1"));

            // Setup box fields

            selectByValue('positioning_type', ce.style.position, true, true);
            selectByValue('positioning_visibility', ce.style.visibility, true, true);
            selectByValue('positioning_overflow', ce.style.overflow, true, true);
            $('#positioning_zindex').val(ce.style.zIndex ? ce.style.zIndex : "");

            $('#positioning_width').val(this.getNum(ce.style.width));
            selectByValue('positioning_width_measurement', this.getMeasurement(ce.style.width));

            $('#positioning_height').val(this.getNum(ce.style.height));
            selectByValue('positioning_height_measurement', this.getMeasurement(ce.style.height));

            this.setupBox(ce, 'positioning_placement', '', '', ['top', 'right', 'bottom', 'left']);

            s = ce.style.clip.replace(new RegExp("rect\\('?([^']*)'?\\)", 'gi'), "$1");
            s = s.replace(/,/g, ' ');

            if (!this.hasEqualValues([this.getVal(s, 0), this.getVal(s, 1), this.getVal(s, 2), this.getVal(s, 3)])) {
                $('#positioning_clip_top').val(this.getNum(this.getVal(s, 0)));
                selectByValue('positioning_clip_top_measurement', this.getMeasurement(this.getVal(s, 0)));
                $('#positioning_clip_right').val(this.getNum(this.getVal(s, 1)));
                selectByValue('positioning_clip_right_measurement', this.getMeasurement(this.getVal(s, 1)));
                $('#positioning_clip_bottom').val(this.getNum(this.getVal(s, 2)));
                selectByValue('positioning_clip_bottom_measurement', this.getMeasurement(this.getVal(s, 2)));
                $('#positioning_clip_left').val(this.getNum(this.getVal(s, 3)));
                selectByValue('positioning_clip_left_measurement', this.getMeasurement(this.getVal(s, 3)));
            } else {
                $('#positioning_clip_top').val(this.getNum(this.getVal(s, 0)));
                selectByValue('positioning_clip_top_measurement', this.getMeasurement(this.getVal(s, 0)));

                var v = $('#positioning_clip_left').val();

                $('#positioning_clip_right').val(v);
                $('#positioning_clip_bottom').val(v);
            }

            //	this.setupBox(f, ce, '', 'border', 'Color');
        },
        getMeasurement: function (s) {
            return s.replace(/^([0-9.]+)(.*)$/, "$2");
        },
        getNum: function (s) {
            if (new RegExp('^(?:[0-9.]+)(?:[a-z%]+)$', 'gi').test(s))
                return s.replace(/[^0-9.]/g, '');

            return s;
        },
        inStr: function (s, n) {
            return new RegExp(n, 'gi').test(s);
        },
        getVal: function (s, i) {
            var a = s.split(' ');

            if (a.length > 1)
                return a[i];

            return "";
        },
        setValue: function (n, v) {
            var el = document.getElementById(n);

            if (el.type == "select") {
                selectByValue(n, v, true, true);
            } else {
                el.value = v;
            }
        },
        setProp: function (n, p, v) {
            var el = document.getElementById(n);
            $(el).prop(p, v);
        },
        setupBox: function (ce, fp, pr, sf, b) {
            if (typeof (b) == "undefined")
                b = ['Top', 'Right', 'Bottom', 'Left'];

            if (this.isSame(ce, pr, sf, b)) {
                this.setProp(fp + "_same", "checked", true);

                this.setValue(fp + "_top", this.getNum(ce.style[pr + b[0] + sf]));
                this.setProp(fp + "_top", "disabled", false);

                this.setValue(fp + "_right", "");

                this.setProp(fp + "_right", "disabled", true);
                this.setValue(fp + "_bottom", "");
                this.setProp(fp + "_bottom", "disabled", true);
                this.setValue(fp + "_left", "");
                this.setProp(fp + "_left", "disabled", true);

                if ($('#' + fp + "_top_measurement").get(0)) {
                    selectByValue(fp + '_top_measurement', this.getMeasurement(ce.style[pr + b[0] + sf]));
                    this.setProp(fp + "_left_measurement", "disabled", true);
                    this.setProp(fp + "_bottom_measurement", "disabled", true);
                    this.setProp(fp + "_right_measurement", "disabled", true);
                }
            } else {
                this.setProp(fp + "_same", "checked", false);

                this.setValue(fp + "_top", this.getNum(ce.style[pr + b[0] + sf]));
                this.setProp(fp + "_top", "disabled", false);

                this.setValue(fp + "_right", this.getNum(ce.style[pr + b[1] + sf]));
                this.setProp(fp + "_right", "disabled", false);

                this.setValue(fp + "_bottom", this.getNum(ce.style[pr + b[2] + sf]));
                this.setProp(fp + "_bottom", "disabled", false);

                this.setValue(fp + "_left", this.getNum(ce.style[pr + b[3] + sf]));
                this.setProp(fp + "_left", "disabled", false);

                if ($('#' + fp + "_top_measurement").get(0)) {
                    selectByValue(fp + '_top_measurement', this.getMeasurement(ce.style[pr + b[0] + sf]));
                    selectByValue(fp + '_right_measurement', this.getMeasurement(ce.style[pr + b[1] + sf]));
                    selectByValue(fp + '_bottom_measurement', this.getMeasurement(ce.style[pr + b[2] + sf]));
                    selectByValue(fp + '_left_measurement', this.getMeasurement(ce.style[pr + b[3] + sf]));
                    this.setProp(fp + "_left_measurement", "disabled", false);
                    this.setProp(fp + "_bottom_measurement", "disabled", false);
                    this.setProp(fp + "_right_measurement", "disabled", false);
                }
            }
        },
        isSame: function (e, pr, sf, b) {
            var a = [],
                i, x;

            if (typeof (b) == "undefined")
                b = ['Top', 'Right', 'Bottom', 'Left'];

            if (typeof (sf) == "undefined" || sf == null)
                sf = "";

            a[0] = e.style[pr + b[0] + sf];
            a[1] = e.style[pr + b[1] + sf];
            a[2] = e.style[pr + b[2] + sf];
            a[3] = e.style[pr + b[3] + sf];

            for (i = 0; i < a.length; i++) {
                if (a[i] == null)
                    return false;

                for (x = 0; x < a.length; x++) {
                    if (a[x] != a[i])
                        return false;
                }
            }

            return true;
        },
        hasEqualValues: function (a) {
            var i, x;

            for (i = 0; i < a.length; i++) {
                if (a[i] == null)
                    return false;

                for (x = 0; x < a.length; x++) {
                    if (a[x] != a[i])
                        return false;
                }
            }

            return true;
        },
        toggleApplyAction: function () {
            this.applyActionIsInsert = !this.applyActionIsInsert;
        },
        applyAction: function () {
            var ce = document.getElementById('container'),
                ed = tinyMCEPopup.editor;

            this.generateCSS();

            tinyMCEPopup.restoreSelection();

            //ed.dom.setAttrib(ed.selection.getNode(), 'style', tinyMCEPopup.editor.dom.serializeStyle(tinyMCEPopup.editor.dom.parseStyle(ce.style.cssText)));

            var newStyles = tinyMCEPopup.editor.dom.parseStyle(ce.style.cssText);

            if (this.applyActionIsInsert) {

                // register formatter to remove all styles
                ed.formatter.register('plugin_style', {
                    inline: 'span',
                    styles: this.existingStyles
                });

                ed.formatter.remove('plugin_style');

                // register formatter to apply new styles
                ed.formatter.register('plugin_style', {
                    inline: 'span',
                    styles: newStyles
                });

                ed.formatter.apply('plugin_style');
            } else {
                var nodes;

                if (tinyMCEPopup.getWindowArg('applyStyleToBlocks')) {
                    nodes = ed.selection.getSelectedBlocks();
                } else {
                    nodes = ed.selection.getNode();
                }

                ed.dom.setAttrib(nodes, 'style', tinyMCEPopup.editor.dom.serializeStyle(newStyles));
            }
        },
        updateAction: function () {
            this.applyAction();
            tinyMCEPopup.close();
        },

        generateCSS: function () {
            var ce = document.getElementById('container'),
                num = new RegExp('[0-9]+', 'g'),
                s, t;

            ce.style.cssText = "";

            // Build text styles
            ce.style.fontFamily = $('#text_font').val();
            ce.style.fontSize = $('#text_size').val() + (this.isNum($('#text_size').val()) ? ($('#text_size_measurement').val() || 'px') : "");
            ce.style.fontStyle = $('#text_style').val();
            ce.style.lineHeight = $('#text_lineheight').val() + (this.isNum($('#text_lineheight').val()) ? $('#text_lineheight_measurement').val() : "");
            ce.style.textTransform = $('#text_case').val();
            ce.style.fontWeight = $('#text_weight').val();
            ce.style.fontVariant = $('#text_variant').val();
            ce.style.color = getColor('#text_color');

            s = "";
            s += $('#text_underline').prop('checked') ? " underline" : "";
            s += $('#text_overline').prop('checked') ? " overline" : "";
            s += $('#text_linethrough').prop('checked') ? " line-through" : "";
            s += $('#text_blink').prop('checked') ? " blink" : "";
            s = s.length > 0 ? s.substring(1) : s;

            if ($('#text_none').prop('checked')) {
                s = "none";
            }

            ce.style.textDecoration = s;

            // Build background styles

            ce.style.backgroundColor = getColor('#background_color');
            ce.style.backgroundImage = $('#background_image').val() != "" ? "url(" + $('#background_image').val() + ")" : "";
            ce.style.backgroundRepeat = $('#background_repeat').val();
            ce.style.backgroundAttachment = $('#background_attachment').val();

            if ($('#background_hpos').val() != "") {
                s = "";
                s += $('#background_hpos').val() + (this.isNum($('#background_hpos').val()) ? $('#background_hpos_measurement').val() : "") + " ";
                s += $('#background_vpos').val() + (this.isNum($('#background_vpos').val()) ? $('#background_vpos_measurement').val() : "");
                ce.style.backgroundPosition = s;
            }

            // Build block styles

            ce.style.wordSpacing = $('#block_wordspacing').val() + (this.isNum($('#block_wordspacing').val()) ? $('#block_wordspacing_measurement').val() : "");
            ce.style.letterSpacing = $('#block_letterspacing').val() + (this.isNum($('#block_letterspacing').val()) ? $('#block_letterspacing_measurement').val() : "");
            ce.style.verticalAlign = $('#block_vertical_alignment').val();
            ce.style.textAlign = $('#block_text_align').val();
            ce.style.textIndent = $('#block_text_indent').val() + (this.isNum($('#block_text_indent').val()) ? $('#block_text_indent_measurement').val() : "");
            ce.style.whiteSpace = $('#block_whitespace').val();
            ce.style.display = $('#block_display').val();

            // Build box styles

            ce.style.width = $('#box_width').val() + (this.isNum($('#box_width').val()) ? $('#box_width_measurement').val() : "");
            ce.style.height = $('#box_height').val() + (this.isNum($('#box_height').val()) ? $('#box_height_measurement').val() : "");


            if (tinymce.isIE) {
                ce.style.styleFloat = $('#box_float').val();
            } else {
                ce.style.cssFloat = $('#box_float').val();
            }

            ce.style.clear = $('#box_clear').val();

            if (!$('#box_padding_same').prop('checked')) {
                ce.style.paddingTop = $('#box_padding_top').val() + (this.isNum($('#box_padding_top').val()) ? $('#box_padding_top_measurement').val() : "");
                ce.style.paddingRight = $('#box_padding_right').val() + (this.isNum($('#box_padding_right').val()) ? $('#box_padding_right_measurement').val() : "");
                ce.style.paddingBottom = $('#box_padding_bottom').val() + (this.isNum($('#box_padding_bottom').val()) ? $('#box_padding_bottom_measurement').val() : "");
                ce.style.paddingLeft = $('#box_padding_left').val() + (this.isNum($('#box_padding_left').val()) ? $('#box_padding_left_measurement').val() : "");
            } else
                ce.style.padding = $('#box_padding_top').val() + (this.isNum($('#box_padding_top').val()) ? $('#box_padding_top_measurement').val() : "");

            if (!$('#box_padding_same').prop('checked')) {
                ce.style.marginTop = $('#box_margin_top').val() + (this.isNum($('#box_margin_top').val()) ? $('#box_margin_top_measurement').val() : "");
                ce.style.marginRight = $('#box_margin_right').val() + (this.isNum($('#box_margin_right').val()) ? $('#box_margin_right_measurement').val() : "");
                ce.style.marginBottom = $('#box_margin_bottom').val() + (this.isNum($('#box_margin_bottom').val()) ? $('#box_margin_bottom_measurement').val() : "");
                ce.style.marginLeft = $('#box_margin_left').val() + (this.isNum($('#box_margin_left').val()) ? $('#box_margin_left_measurement').val() : "");
            } else
                ce.style.margin = $('#box_margin_top').val() + (this.isNum($('#box_margin_top').val()) ? $('#box_margin_top_measurement').val() : "");

            // Build border styles

            if (!$('#border_style_same').prop('checked')) {
                ce.style.borderTopStyle = $('#border_style_top').val();
                ce.style.borderRightStyle = $('#border_style_right').val();
                ce.style.borderBottomStyle = $('#border_style_bottom').val();
                ce.style.borderLeftStyle = $('#border_style_left').val();
            } else
                ce.style.borderStyle = $('#border_style_top').val();

            if (!$('#border_width_same').prop('checked')) {
                ce.style.borderTopWidth = $('#border_width_top').val() + (this.isNum($('#border_width_top').val()) ? $('#border_width_top_measurement').val() : "");
                ce.style.borderRightWidth = $('#border_width_right').val() + (this.isNum($('#border_width_right').val()) ? $('#border_width_right_measurement').val() : "");
                ce.style.borderBottomWidth = $('#border_width_bottom').val() + (this.isNum($('#border_width_bottom').val()) ? $('#border_width_bottom_measurement').val() : "");
                ce.style.borderLeftWidth = $('#border_width_left').val() + (this.isNum($('#border_width_left').val()) ? $('#border_width_left_measurement').val() : "");
            } else
                ce.style.borderWidth = $('#border_width_top').val() + (this.isNum($('#border_width_top').val()) ? $('#border_width_top_measurement').val() : "");

            if (!$('#border_color_same').prop('checked')) {
                ce.style.borderTopColor = getColor('#border_color_top');
                ce.style.borderRightColor = getColor('#border_color_right');
                ce.style.borderBottomColor = getColor('#border_color_bottom');
                ce.style.borderLeftColor = getColor('#border_color_left');
            } else
                ce.style.borderColor = getColor('#border_color_top');

            // Build list styles

            ce.style.listStyleType = $('#list_type').val();
            ce.style.listStylePosition = $('#list_position').val();
            ce.style.listStyleImage = $('#list_bullet_image').val() != "" ? "url(" + $('#list_bullet_image').val() + ")" : "";

            // Build positioning styles

            ce.style.position = $('#positioning_type').val();
            ce.style.visibility = $('#positioning_visibility').val();

            if (ce.style.width == "")
                ce.style.width = $('#positioning_width').val() + (this.isNum($('#positioning_width').val()) ? $('#positioning_width_measurement').val() : "");

            if (ce.style.height == "")
                ce.style.height = $('#positioning_height').val() + (this.isNum($('#positioning_height').val()) ? $('#positioning_height_measurement').val() : "");

            ce.style.zIndex = $('#positioning_zindex').val();
            ce.style.overflow = $('#positioning_overflow').val();

            if (!$('#positioning_placement_same').prop('checked')) {
                ce.style.top = $('#positioning_placement_top').val() + (this.isNum($('#positioning_placement_top').val()) ? $('#positioning_placement_top_measurement').val() : "");
                ce.style.right = $('#positioning_placement_right').val() + (this.isNum($('#positioning_placement_right').val()) ? $('#positioning_placement_right_measurement').val() : "");
                ce.style.bottom = $('#positioning_placement_bottom').val() + (this.isNum($('#positioning_placement_bottom').val()) ? $('#positioning_placement_bottom_measurement').val() : "");
                ce.style.left = $('#positioning_placement_left').val() + (this.isNum($('#positioning_placement_left').val()) ? $('#positioning_placement_left_measurement').val() : "");
            } else {
                s = $('#positioning_placement_top').val() + (this.isNum($('#positioning_placement_top').val()) ? $('#positioning_placement_top_measurement').val() : "");
                ce.style.top = s;
                ce.style.right = s;
                ce.style.bottom = s;
                ce.style.left = s;
            }

            if (!$('#positioning_clip_same').prop('checked')) {
                s = "rect(";
                s += (this.isNum($('#positioning_clip_top').val()) ? $('#positioning_clip_top').val() + $('#positioning_clip_top_measurement').val() : "auto") + " ";
                s += (this.isNum($('#positioning_clip_right').val()) ? $('#positioning_clip_right').val() + $('#positioning_clip_right_measurement').val() : "auto") + " ";
                s += (this.isNum($('#positioning_clip_bottom').val()) ? $('#positioning_clip_bottom').val() + $('#positioning_clip_bottom_measurement').val() : "auto") + " ";
                s += (this.isNum($('#positioning_clip_left').val()) ? $('#positioning_clip_left').val() + $('#positioning_clip_left_measurement').val() : "auto");
                s += ")";

                if (s != "rect(auto auto auto auto)")
                    ce.style.clip = s;
            } else {
                s = "rect(";
                t = this.isNum($('#positioning_clip_top').val()) ? $('#positioning_clip_top').val() + $('#positioning_clip_top_measurement').val() : "auto";
                s += t + " ";
                s += t + " ";
                s += t + " ";
                s += t + ")";

                if (s != "rect(auto auto auto auto)")
                    ce.style.clip = s;
            }

            ce.style.cssText = ce.style.cssText;
        },
        isNum: function (s) {
            return new RegExp('[0-9]+', 'g').test(s);
        },

        showDisabledControls: function () {},

        fillSelect: function (s, param, dval, sep, em) {
            var i, ar, p, se;

            sep = typeof (sep) == "undefined" ? ";" : sep;

            if (em) {
                addSelectValue(s, "", "");
            }

            ar = tinyMCEPopup.getParam(param, dval).split(sep);

            for (i = 0; i < ar.length; i++) {
                se = false;

                if (ar[i].charAt(0) == '+') {
                    ar[i] = ar[i].substring(1);
                    se = true;
                }

                p = ar[i].split('=');

                if (p.length > 1) {
                    addSelectValue(s, p[0], p[1]);

                    if (se) {
                        selectByValue(s, p[1]);
                    }
                } else {
                    addSelectValue(s, p[0], p[0]);

                    if (se) {
                        selectByValue(s, p[0]);
                    }
                }
            }
        },
        toggleSame: function (ce, pre) {
            var s = ce.checked;

            $('#' + pre + '_right, #' + pre + '_bottom, #' + pre + '_left').attr('disabled', s).toggleClass('disabled', s).change();
            $('#' + pre + '_right_measurement, #' + pre + '_bottom_measurement, #' + pre + '_left_measurement').attr('disabled', s).toggleClass('disabled', s);
        },
        synch: function (fr, to) {
            $('#' + to).val($('#' + fr).val())

            if (document.getElementById[fr + "_measurement"]) {
                selectByValue(to + "_measurement", $('#' + fr + "_measurement").val());
            }
        },
        updateTextDecorations: function () {
            var noneChecked = $("#text_none").is(':checked');

            $("#text_underline, #text_overline, #text_linethrough, #text_blink").each(function () {
                $(this).prop('disabled', noneChecked);
                if (noneChecked) {
                    $(this).prop('checked', false);
                }
            });
        }
    };

    tinyMCEPopup.onInit.add(StyleDialog.init, StyleDialog);

    window.StyleDialog = StyleDialog;

})(tinymce, tinyMCEPopup, jQuery);