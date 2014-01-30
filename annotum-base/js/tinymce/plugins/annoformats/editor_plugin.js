(function(){
	tinymce.create('tinymce.plugins.annoFormats', {

		init : function(ed, url){
			var t = this;
			t.editor = ed;
			t.helper = ed.plugins.textorum.helper;
			t.textorum = ed.plugins.textorum;

			ed.addCommand('Anno_Monospace', function() {
				tinymce.activeEditor.formatter.toggle('monospace');
			});

			ed.addCommand('Anno_Preformat', function() {
				tinymce.activeEditor.formatter.toggle('preformat');
			});

			ed.addButton('annopreformat', {
				title : 'Preformat',
				//ed.getLang('advanced.references_desc'),
				cmd : 'Anno_Preformat'
			});

			ed.addButton('annomonospace', {
				title : 'Monospace',
				//ed.getLang('advanced.references_desc'),
				cmd : 'Anno_Monospace'
			});

			// Add node change function which updates format dropdown
			ed.onInit.add(function() {
				ed.onNodeChange.add(t._nodeChanged, t);
			});
		},
		// Update format dropdown on change
		_nodeChanged : function (ed, cm) {
			if (c = cm.get('annoformatselect')) {
				var parent = ed.dom.getParent(ed.selection.getNode(), 'TITLE, P, SEC'), selVal;
				if (parent) {
					selVal = parent.nodeName.toLowerCase();
				}
				else {
					selVal = 'format';
				}
				c.select(selVal);
			}
		},

		// @TODO Translation
		createControl : function(n, cm) {
			var t = this, c, ed = t.editor;
			var bm = this.bookmark;

			switch (n) {
				case 'annosection':
					var c = cm.createMenuButton('annosection', {
						title : 'Insert Section',
					});
					c.onRenderMenu.add(function(c, m) {
						m.add({title : 'New Section', onclick : function() {
							t.insertSection();
						}});
						m.add({title : 'New Subsection', onclick : function() {
							t.insertSubsection();
						}});
					});
				// Return the new splitbutton instance
				return c;
				break;
				case 'annoformatselect':
					function applyAnnoFormat(format) {
						var sel = ed.selection, dom = ed.dom, range = sel.getRng(), remove = false;
						// We don't care about the selection, just collapse
						sel.collapse(0);

						// Returns a new node that removes all the unsupported tags of the new format
						function getNewNode(originalNode, newNodeName) {
							var newNode = ed.dom.create(newNodeName, null, '<div>'+originalNode.innerHTML+'</div>');
							// We want to remove the div, which is required above
							dom.remove(newNode.childNodes[0], true);
							for (var i=0; i < newNode.childNodes.length; i++) {
								childNode = newNode.childNodes[i];
								if (childNode.nodeName == 'DIV') {
									dom.remove(childNode, true);
								}
								if (childNode.nodeType != 3 && !ed.schema.isValidChild(newNode.nodeName.toLowerCase(), childNode.nodeName.toLowerCase())) {
									//@TODO maybe keep formats, just strip them
									dom.remove(childNode);
								}
							}

							return newNode;
						}

						// Determines whether or not the immediate parent supports the new format type
						function canApplyFormat(node, newFormat) {
							if (!node) {
								return false;
							}

							return !!ed.schema.isValidChild(node.parentNode.nodeName.toLowerCase(), newFormat.toLowerCase());
						}

						// Find first parent
						var wrapper = ed.dom.getParent(sel.getNode(), 'TITLE, P, SEC');

						// Only continue if we can insert the new format into the parent node.
						if (!canApplyFormat(wrapper, format) && wrapper !== null) {
							return false;
						}

						if (wrapper !== null) {
							// Remove2
							if (format.toLowerCase() === wrapper.nodeName.toLowerCase()) {
								// Move to the end of the current wrapper, and get the bookmark
								// This prevents us from having a bookmark in the middle of an element that may be removed
								sel.select(wrapper);
								sel.collapse(0);
								var bookmark = sel.getBookmark();

								newNode = getNewNode(wrapper, wrapper.parentNode.nodeName);
								wrapper.parentNode.replaceChild(newNode, wrapper);
								dom.remove(newNode, true);

								sel.moveToBookmark(bookmark);

								remove = true;
							}
							else {
								// convert
								newNode = getNewNode(wrapper, format);
								wrapper.parentNode.replaceChild(newNode, wrapper);
							}
						}
						else {
							// Insert a new node if we don't have a valid wrapper
							var newNode = ed.dom.create(format);
							range.insertNode(newNode);
						}
						if (newNode && !remove) {
							range.selectNodeContents(newNode);
							range.collapse(0);
							sel.setRng(range);
						}
					}

					// Create the list box
					var listbox = cm.createListBox('annoformatselect', {
						title : 'Format',
						onselect : function(v) {
							var resetIsIE = false;
							// Trick tinyMCE into thinking we're not in IE, and preform as exptected
							// Range Dom errors occur otherwise.
							if (tinymce.isIE) {
								tinymce.isIE = false;
								resetIsIE = true;
							}
							ed.undoManager.beforeChange();
							applyAnnoFormat(v);
							ed.undoManager.add();
							ed.focus();
							if (resetIsIE) {
								tinymce.isIE = true;
							}
						}
					});

					// Add some values to the list box
					listbox.add('Heading', 'title');
					listbox.add('Paragraph', 'p');
					listbox.add('Section', 'sec');

					// Return the new listbox instance
					return listbox;
					break;
			}
		//	return null;
		},
		_insertSection: function(isSubsection) {
			var ed = this.editor, doc = ed.getDoc(), node = ed.selection.getNode(), dom = ed.dom, parent = ed.dom.getParent(node, 'SEC, BODY'), range, elYPos, vpHeight = dom.getViewPort(ed.getWin()).h;
			var curNodeName = this.helper.getLocalName(node), target, newElement = newSec(), eleArray;

			isSubsection = typeof isSubsection !== 'undefined' ? isSubsection : false;

			// If In sec and insert sub section or we're in the body, use insert into
			if ((curNodeName == 'sec' && isSubsection) || curNodeName == 'body') {
				dom.add(node, newElement);
			}
			else {
				// Special case, current node is section and not inserting sub section
				if (curNodeName == 'sec') {
					target = node;
				}
				else {
					target = dom.getParent(node, this.helper.testNameIs('sec'));
					if (isSubsection && target !== null) {
						target = target.lastChild;
					}
				}
				if (target !== null) {
					dom.insertAfter(newElement, target);
				}
			}
			eleArray = dom.select(' > title', newElement);

			// Focus the editor since dropdown menus lose focus
			ed.focus();

			if (eleArray.length > 0) {
				newElement = eleArray[0];
			}

			if (doc.createRange) { // all browsers, except IE before version 9
				range = doc.createRange();
				range.selectNodeContents(newElement);
			}
			else { // IE < 9
				range = doc.selection.createRange();
				range.moveToElementText(newElement);
			}

			range.collapse(1);
			ed.selection.setRng(range);

			elYPos = dom.getPos(newElement).y;
			// Scroll to new section
			if (elYPos > vpHeight) {
					ed.getWin().scrollTo(0, elYPos);
			}

			ed.nodeChanged();

			// Create a new sec element with a title
			function newSec() {
				var sec = dom.create(ed.plugins.textorum.translateElement('sec'), {'class': 'sec', 'data-xmlel': 'sec'});
				dom.add(sec, ed.plugins.textorum.translateElement('title'), {'class': 'title', 'data-xmlel': 'title'}, '&#xA0;');
				dom.add(sec, ed.plugins.textorum.translateElement('p'), {'class': 'p', 'data-xmlel': 'p'}, '&#xA0;');
				return sec;
			}

		},
		insertSection : function () {
			this._insertSection(false);

		},
		insertSubsection : function () {
			this._insertSection(true);
		},
		getInfo : function() {
			return {
				longname: 'Annotum Formats',
				author: 'Crowd Favorite',
				authorurl: 'http://crowdfavorite.com/',
				infourl: 'http://annotum.wordpress.com/',
				version: "0.2"
			};
		}
	});

	tinymce.PluginManager.add('annoFormats', tinymce.plugins.annoFormats);
})();
