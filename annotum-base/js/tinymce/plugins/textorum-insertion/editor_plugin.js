(function($) {
	tinymce.create('tinymce.plugins.textorumInsertion', {
		init : function(ed, url) {
			var self = this,
				disabled = true,
				editor = ed,
				cm = new tinyMCE.ControlManager(ed),
				dropmenu = cm.createDropMenu('textorum-insertion-dropmenu'),
				dropmenuVisible = false,
				dropmenuJustClicked = false,
				ignoredElements = [
					'media',
					'xref',
					'disp-quote',
					'inline-graphic',
					'inline-formula',
					'disp-formula',
					'table-wrap',
					'bold',
					'italic',
					'monospace',
					'underline',
					'sup',
					'sub'
				];

			// Key Bindings
			//
			ed.onKeyDown.addToTop(function(ed, e) {
				var target;

				// Enter
				if (!e.shiftKey && e.keyCode == 13) {

					// Ctrl + Enter
					if (e.ctrlKey) {
						// Check for parent p
						target = ed.dom.getParent(ed.selection.getNode().parentNode, '.p');
						if (target) {
							return !self.insertElement('p', 'after', target);
						}
						else {
							return !self.insertElement('sec', 'after', ed.dom.getParent(ed.selection.getNode(), '.sec'));
						}
					}
					else {
						return !self.insertElement('p', 'after');
					}
				}
				return true;
			});


			editor.addCommand('Textorum_Insertion_Menu', function(ui, where) {
				var options, $button;

				$button = $('#'+editor.editorId).next('.mceEditor').find('.mceButton.mce_textorum-insertion-' + where);

				if (dropmenuVisible) {
					dropmenu.hideMenu();
					dropmenuVisible = false;
				}
				else {

					where = where || 'inside';
					options = self.getValidElements(editor.selection.getNode(), where);

					dropmenu.removeAll();
					if (options.length) {
						options = options.filter(function(a) { return ignoredElements.indexOf(a) === -1; });
						for (var i = 0, len = options.length; i < len; i++) {
							(function(element_name) {
								dropmenu.add(new tinymce.ui.MenuItem('textorum-insertion-item-' + element_name ,{
									title: element_name,
									onclick: function() {
										self.insertElement(element_name, where);
									}
								}));
							})(options[i]);
						}
					}
					else {
						dropmenu.add(new tinymce.ui.MenuItem('textorum-insertion-item-none', {
							title: 'No elements available',
							style: 'color:#999',
							onclick: function() {
								dropmenuVisible = false;
								return false;
							}
						}));
					}

					dropmenu.showMenu($button.offset().left, $button.offset().top + 24);
					dropmenuJustClicked = dropmenuVisible = true;
					setTimeout(function() { dropmenuJustClicked = false; }, 250);

				}
			});

			editor.onNodeChange.add(function(ed, cm, e) {
				var options = editor.plugins.textorum.validator.validElementsForNode(editor.selection.getNode(), "inside", "array");

				if (dropmenuVisible && !dropmenuJustClicked) {
					dropmenu.hideMenu();
					dropmenuVisible = false;
				}

				if (options.indexOf('inline-graphic') === -1 || options.indexOf('fig') === -1) {
					cm.get('annoimages').setDisabled(true);
					cm.get('annoequations').setDisabled(true);
				}
				else {
					cm.get('annoimages').setDisabled(false);
					cm.get('annoequations').setDisabled(false);
				}

				if (options.indexOf('disp-quote') === -1) {
					cm.get('annoquote').setDisabled(true);
				}
				else {
					cm.get('annoquote').setDisabled(false);
				}
			});

			// Register example button
			editor.addButton('textorum-insertion-before', {
				title : 'Insert Element Before',
				cmd : 'Textorum_Insertion_Menu',
				value: 'before'
			});

			editor.addButton('textorum-insertion-inside', {
				title : 'Insert Element Inside',
				cmd : 'Textorum_Insertion_Menu',
				value: 'inside'
			});

			editor.addButton('textorum-insertion-after', {
				title : 'Insert Element After',
				cmd : 'Textorum_Insertion_Menu',
				value: 'after'
			});

			editor.addShortcut('ctrl+enter', 'Insert Element', 'Textorum_Insertion');
		},

		insertElement: function(element_name, where, target) {
			var editor = tinyMCE.activeEditor,
				newNode = editor.dom.create(
					editor.plugins.textorum.translateElement(element_name),
					{'class': element_name, 'data-xmlel': element_name},
					'&#xA0;'
				),
				range, elYPos, options;

			where = where || 'inside';
			target = target || editor.selection.getNode();

			options = this.getValidElements(target, where);

			if (options.indexOf(element_name) === -1) {
				return false;
			}

			// Add additionally required child elements
			switch (element_name) {
				case 'sec':
					newNode.innerHTML = '';
					newNode.appendChild(
						editor.dom.create(
							editor.plugins.textorum.translateElement('title'),
							{'class': 'title', 'data-xmlel': 'title'},
							'&#xA0;'
						)
					);
					break;
				case 'fig':
					newNode.innerHTML = '';
					newNode.appendChild(
						editor.dom.create(
							editor.plugins.textorum.translateElement('label'),
							{'class': 'title', 'data-xmlel': 'title'},
							'&#xA0;'
						)
					);

					var cap = editor.dom.create(
						editor.plugins.textorum.translateElement('caption'),
						{'class': 'caption', 'data-xmlel': 'caption'}
					);

					cap.appendChild(
						editor.dom.create(
							editor.plugins.textorum.translateElement('p'),
							{'class': 'p', 'data-xmlel': 'p'},
							'&#xA0;'
						)
					);

					newNode.appendChild(cap);

					break;
			}

			dropmenuVisible = false;
			switch(where) {
				case 'before':
					newNode = target.parentNode.insertBefore(newNode, target);
					break;

				case 'inside':
					newNode = editor.selection.getNode().appendChild(newNode);
					break;

				case 'after':
					if (target.nextSibling) {
						newNode = target.parentNode.insertBefore(newNode, target.nextSibling);
					}
					else {
						newNode = target.parentNode.appendChild(newNode);
					}
					break;
			}

			if (document.createRange) {     // all browsers, except IE before version 9
				range = document.createRange();
				if (newNode.firstChild) {
					range.selectNodeContents(newNode.firstChild);
				}
				else {
					range.selectNodeContents(newNode);
				}
			}

			range.collapse(1);
			editor.selection.setRng(range);

			elYPos = editor.dom.getPos(newNode).y;
			// Scroll to new section
			if (elYPos > editor.dom.getViewPort(editor.getWin()).h) {
					editor.getWin().scrollTo(0, elYPos);
			}

			editor.nodeChanged();
			return newNode;
		},

		getValidElements: function(target, where) {
			var options, ed = tinyMCE.activeEditor;

			target = target || ed.selection.getNode();
			where = where || 'inside';

			options = ed.plugins.textorum.validator.validElementsForNode(target, where, "array");

			// Textorum doesn't like putting things at the top level body, so account for top level section availability
			if (!options.length && target.className.toUpperCase() == 'SEC' && where !== 'inside') {
				options.push('sec');
			}

			return options;
		},

		getInfo : function() {
			return {
				longname : 'Textorum Context Aware Element Insertion',
				author : 'Crowd Favorite',
				authorurl : 'http://crowdfavorite.com',
				infourl : '',
				version : "1.0"
			};
		}
	});

	// Register plugin
	tinymce.PluginManager.add('textorumInsertion', tinymce.plugins.textorumInsertion);
})(jQuery);