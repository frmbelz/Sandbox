define(['./angular-app'], function(app)
{
	app.factory('ScriptEditorAutocomplete', ['$rootScope', function($rootScope)
	{
		return {
			initialize: function(editor)
			{
				var obj = {
					methodEditor: editor,
					currentNode: $rootScope.fields.selectedNode
				};
				$rootScope.$watch('fields.selectedNode', function(newval)
				{
					obj.currentNode = newval;
				});
				initialize.call(obj);
				return obj;
			}
		}
	}]);
	/**********************************************************************
	 * Everything below this point is legacy unused code, but might be
	 * useful as a guide later, once we reimplement autocomplete.
	 *********************************************************************/
	function initialize()
	{
		var self = this;
		//show the little popup that displays the parameters to a function call
		this.setupFunctionTip = function(text, editor, offset, width)
		{
			if ($('#FunctionTip').length == 0)
			{
				$(document.body).append("<form id='FunctionTip' />");
			}
			$('#FunctionTip').text(text);
			$('#FunctionTip').css('top', (offset.top - $('#FunctionTip').height()) + 'px');
			$('#FunctionTip').css('left', (offset.left) + 'px');
			$('#FunctionTip').show();
		}
		this.insetKeySuggestion = function(suggestedText)
		{
			$('#AutoComplete').hide();
			if (suggestedText != "")
			{
				//backspace letters up to the dot or bracket
				for (var i = 0; i < self.filter.length; i++)
					self.methodEditor.remove('left');
				//insert
				var isfunction = false;
				for (var i = 0; i < self.keys.length; i++)
					if (self.keys[i][0] == suggestedText && self.keys[i][1] == Function) isfunction = true;
				if (self.autoCompleteTriggerKey == '[')
				{
					suggestedText = suggestedText + "]";
				}
				if (isfunction)
				{
					suggestedText = suggestedText + "(";
					//focus on the editor
					window.setImmediate(function()
					{
						self.methodEditor.focus();
						self.triggerFunctionTip(self.methodEditor, true);
					}, 0);
				}
				else
				{
					window.setImmediate(function()
					{
						self.methodEditor.focus();
					}, 0);
				}
				self.methodEditor.insert(suggestedText);
			}
		}
		this.initAutoComplete = function(keys, editor)
			{
				//append the div and create it
				$(document.body).append("<form id='AutoComplete' tabindex=890483 />");
				/*$('#AutoComplete').on('blur', function(e, key)
				{
					//there is some sort of error here, this prevention is a workaround. 
					//seems to get a blur event only on first show
					if (!this.firstshow)
					{
						this.firstshow = true;
					}
					else
					{
						$('#AutoComplete').hide();
					}
				});*/
				//bind up events
				$('#AutoComplete').on('command', function(e, key)
				{
					
					//enter or dot will accept the suggestion
					if (key == "enter")
					{
						//find the selected text
						var index = $(this).attr('autocompleteindex');
						var text = $($(this).children()[index]).text();
						$('#AutoComplete').hide();
						self.insetKeySuggestion(text);
						return true;
					}
					else if (key == "down") //down
					{
						//move up or down the list
						var children = $(this).children();
						var index = $(this).attr('autocompleteindex');
						index++;
						if (index > children.length - 1)
							index = children.length - 1;
						$(this).attr('autocompleteindex', index);
						//deal with the scrolling
						$('#AutoComplete').scrollTop((index) * $(children[0]).height() + index - 75);
						//show the selection
						for (var i = 0; i < children.length; i++)
						{
							if (i == index)
							{
								$(children[i]).css('background', 'rgb(90, 180, 230)');
							}
							else
								$(children[i]).css('background', '');
						}
						e.preventDefault();
						return false;
					}
					else if (key == "up") //up
					{
						//move up or down the list
						var children = $(this).children();
						var index = $(this).attr('autocompleteindex');
						index--;
						if (index < 0)
							index = 0;
						$(this).attr('autocompleteindex', index);
						//deal with scrolling drama
						$('#AutoComplete').scrollTop((index) * $(children[0]).height() + index - 75);
						//show the selected text
						for (var i = 0; i < children.length; i++)
						{
							if (i == index)
							{
								$(children[i]).css('background', 'rgb(90, 180, 230)');
							}
							else
								$(children[i]).css('background', '');
						}
						e.preventDefault();
						return false;
					}
					else if (key == "exit") //esc
					{
						//just hide the editor
						$('#AutoComplete').hide();
						self.methodEditor.focus();
					}
					else if (key == 16) //esc
					{
						//do nothing for shift
					}
					else
					{
						return;
						//this is all other keys, 
						var key = e.which;
						key = String.fromCharCode(key);
						//if the key is a character or backspace, edit the filter
						if (e.which == 8 || (e.which < 91 && e.which > 64) || e.which == 189)
						{
							//if it's not a backspace, add it to the filter
							if (e.which != 8 && e.which != 189)
								self.filter += key;
							else if (e.which == 189)
								self.filter += '_';
							else
							{ //if the backspace occurs with no filter, then close and remove
								if (self.filter.length == 0)
								{
									window.setImmediate(function()
									{
										self.methodEditor.remove('left');
										$('#AutoComplete').hide();
										self.methodEditor.focus();
									}, 0);
									e.preventDefault();
									return;
								}
								//else, backspace from both the editor and the filter string
								self.filter = self.filter.substr(0, self.filter.length - 1);
								self.methodEditor.remove('left');
							}
							//wait 15ms, then show this whole dialog again
							window.setImmediate(function()
							{
								//console.log(self.filter);
								$('#AutoComplete').focus();
								self.setupAutocomplete(self.keys, self.methodEditor, self.filter);
							}, 0);
						}
						else
						{
							//any key that is not a character or backspace cancels the autocomplete
							window.setImmediate(function()
							{
								$('#AutoComplete').hide();
								self.methodEditor.focus();
							}, 0);
						}
						//this is important for keypresses, so that they will filter down into ACE
						//self.methodEditor.focus();
					}
					return false;
				});
			}
			//Setup the div for the autocomplete interface
		this.setupAutocomplete = function(keys, editor)
			{
				if(!keys || keys.length == 0)
				{
					//$('#AutoComplete').hide()
					//return;

					//if there are no real keys, let's fall back on identifiers in the code

					var session = editor.getSession();
					debugger;
				}
				
				this.activeEditor = editor;
				if (!self.filter)
					self.filter = '';
				//Get the position of hte cursor on the editor			
				var offset = $(editor.renderer.$cursorLayer.cursor).offset();
				var width = $(editor.renderer.$cursorLayer.cursor).width();
				if ($('#AutoComplete').length == 0)
				{
					this.initAutoComplete(keys, length);
				}
				//now that the gui is setup, populate it with the keys
				$('#AutoComplete').empty();
				var first = false;
				for (var i in self.keys)
				{
					//use the filter string to filter out suggestions
					if (self.keys[i][0].toLowerCase().indexOf(self.filter.toLowerCase()) != 0)
						continue;
					//Append a div	
					$('#AutoComplete').append("<div id='AutoComplete_" + i + "' class='AutoCompleteOption'/>");
					$('#AutoComplete_' + i).text(self.keys[i][0]);
					if (self.keys[i][1] == Function)
					{
						$('#AutoComplete_' + i).addClass('AutoCompleteOptionFunction');
					}
					$('#AutoComplete_' + i).attr('autocompleteindex', i);
					if (!first)
						$('#AutoComplete_' + i).css('background', 'lightblue');
					first = true;
					//Clicking on the div just inserts the text, and hides the GUI
					$('#AutoComplete_' + i).mousedown(function()
					{
						var text = $(this).text();
						self.insetKeySuggestion(text);
						return true;
					});
				}
				if($('#AutoComplete').children().length == 0)
				{
					
					$('#AutoComplete').hide();
				}
				//$('#AutoComplete').focus();
				$('#AutoComplete').css('top', offset.top + 'px');
				$('#AutoComplete').css('left', (offset.left + width) + 'px');
				$('#AutoComplete').css('max-height', Math.min(150, ($(window).height() - offset.top)) + 'px');
				$('#AutoComplete').show();
				$('#AutoComplete').attr('autocompleteindex', 0);
				$('#AutoComplete').css('overflow', 'hidden');
				$('#AutoComplete').scrollTop(0);
				//this is annoying. Why?
				$(document.body).scrollTop(0);
			//	window.setImmediate(function()
			//	{
			//		$('#AutoComplete').focus();
			//	}, 0);
			}
			// a list of idenifiers to always ignore in the autocomplete
		this.ignoreKeys = ["defineProperty"];

		function ArrNoDupe(a) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
        temp[a[i]] = true;
    var r = [];
    for (var k in temp)
        r.push(k);
    return r;
}

		this.beginAutoComplete = function(editor, chr, line, filter)
			{
				//get the keys
				self.keys = vwf.callMethod(self.currentNode.id, 'JavascriptEvalKeys', [line]);

				if(line == 'window')
				{
					var session = editor.getSession();
					var locals = ArrNoDupe(session.getValue().split(/[ ;=\[\]\n]/).filter(function(e){if (!e) {return false} else {return !e.match(/[^a-zA-Z0-9]/)}}));
					for(var i = 0; i < locals.length; i ++)
					{
						locals[i] = [locals[i],String]
						
					}
					self.keys = self.keys.concat(locals);
				}
				if (self.keys)
				{
					//first, remove from the list all keys beginning with "___" and the set list of ignoreable keys
					var i = 0;
					if (!_ScriptEditor.showHiddenProperties)
					{
						while (i < self.keys.length)
						{
							if (self.keys[i][0].search(/^___/) != -1)
							{
								self.keys.splice(i, 1);
							}
							else
							{
								i++;
							}
						}
						i = 0;
						while (i < self.keys.length)
						{
							for (var j = 0; j < self.ignoreKeys.length; j++)
							{
								if (self.keys[i][0] == self.ignoreKeys[j])
								{
									self.keys.splice(i, 1);
									break;
								}
							}
							i++;
						}
					}
					this.autoCompleteTriggerKey = chr;
					//if the character that started the autocomplete is a dot, then remove the keys that have
					//spaces or special characters, as they are not valid identifiers
					if (chr == '.')
					{
						var remove = [];
						var i = 0;
						while (i < self.keys.length)
						{
							if (self.keys[i][0].search(/[^0-9a-zA-Z_]/) != -1 || self.keys[i][0].search(/[0-9]/) == 0)
							{
								self.keys.splice(i, 1);
							}
							else
							{
								i++;
							}
						}
					}
					else
					{
						//if the character was a bracket, suround the key with quotes
						for (var i = 0; i < self.keys.length; i++)
						{
							if (self.keys[i][0].search(/[^0-9]/) != -1)
							{
								self.keys[i][0] = '"' + self.keys[i][0] + '"';
							}
						}
					}
					//sort the keys by name
					self.keys.sort(function(a, b)
					{
						return a[0] > b[0] ? 1 : -1;
					})

					window.setImmediate(function()
					{
						self.filter = filter;
						self.setupAutocomplete(self.keys, editor, filter);
					}, 0);
				}
			}
			//The dot or the bracket was hit, so open the suggestion box
		this.triggerAutoComplete = function(editor)
			{
				var cur = editor.getCursorPosition();
				var session = editor.getSession();
				var line = session.getLine(cur.row);
				var chr = line[cur.column];
				//Open on . or [
				if (chr == '.' || chr == '[' || $('#AutoComplete').is(':visible'))
				{
					
					var lineinfo = self.filterLine(line);
					
					if(!lineinfo.value)
					{
						$("#AutoComplete").hide();
						return;
					}
					//don't show autocomplete for lines that contain a (, because we'll be calling a functio ntaht might have side effects
					//if (line.indexOf('(') == -1 && line.indexOf('=') == -1)
					if(lineinfo.trigger)
					{
						this.beginAutoComplete(editor, lineinfo.trigger, lineinfo.value, lineinfo.filter);
					}else
					$('#AutoComplete').hide();
				}
			}
			//Test for an open paren, then show the parameter help
		this.triggerFunctionTip = function(editor, inserted)
		{
			var cur = editor.getCursorPosition();
			var session = editor.getSession();
			var line = session.getLine(cur.row);
			//Only show for open paren
			if (line[cur.column] == '(' || (inserted && line[cur.column - 1] == '('))
			{
				//Get the line
				line = line.substr(0, cur.column);
				var splits = line.split(' ');
				line = splits[splits.length - 1];
				splits = line.split(';');
				line = splits[splits.length - 1];
				//Don't show for lines that have ( or ) (other than the one that triggered the autocomplete) because function calls
				//might have side effects
				if (inserted && line.indexOf('(') == line.length - 1)
				{
					line = line.substring(0, line.length - 1);
				}
				if (line.indexOf('(') == -1 && line.indexOf('=') == -1)
				{
					//Get the text for the tooltip
					var text = vwf.callMethod(self.currentNode.id, 'JavascriptEvalFunction', [line]);
					if (text)
					{
						window.setImmediate(function()
						{
							self.setupFunctionTip(text, editor, $(editor.renderer.$cursorLayer.cursor).offset(), $(editor.renderer.$cursorLayer.cursor).width());
						}, 0);
					}
				}
			}
		}
		this.methodEditor.keyBinding.origOnCommandKey = this.methodEditor.keyBinding.onCommandKey;
		//hide or show the function top based on the inputs
		this.methodEditor.on('change', function(e)
		{
			console.log('Editor changed');
			self.triggerAutoComplete(self.methodEditor);
			self.triggerFunctionTip(self.methodEditor);
			//hide if removing an open paren
			if (e.data.action == "removeText")
			{
				if (e.data.text.indexOf('(') != -1)
					$('#FunctionTip').hide();
			}
			//hide if inserting a close paren
			if (e.data.action == "insertText")
			{
				if (e.data.text.indexOf(')') != -1)
					$('#FunctionTip').hide();
			}
			var cur = self.methodEditor.getCursorPosition();
			var session = self.methodEditor.getSession();
			var line = session.getLine(cur.row);
			var chr1 = line[cur.column - 1];
			var chr2 = line[cur.column];
			if (chr2 == ')')
				$('#FunctionTip').hide();
		});

		this.methodEditor.keyBinding.origOnTextInput = this.methodEditor.keyBinding.onTextInput;
		this.methodEditor.keyBinding.onTextInput = function(text) {
		    if (text == "\n" && $('#AutoComplete').is(":visible")) {
		        $('#AutoComplete').trigger('command','enter');
		    }else if (text == "." && $('#AutoComplete').is(":visible")) {
		        $('#AutoComplete').trigger('command','enter');
		        this.origOnTextInput(text);
		    }
		    else
		    {
		    	this.origOnTextInput(text);
		    }
		}

		//hide or show the function top based on the inputs
		this.methodEditor.keyBinding.onCommandKey = function(e, hashId, keyCode)
		{

			if($('#AutoComplete').is(":visible"))
			{
				if (keyCode == 38)
				{
					$('#AutoComplete').trigger('command','up');
					return;	
				}
				if (keyCode == 39)
				{
					$('#AutoComplete').trigger('command','enter');
					return;	
				}
					
				if (keyCode == 40)
				{
					$('#AutoComplete').trigger('command','down');
					return;	
				}
				if (keyCode == 27 || keyCode == 37)
				{
					$('#AutoComplete').trigger('command','exit');
					return;	
				}
					
				
			}
			console.log(keyCode);
			var cur = self.methodEditor.getCursorPosition();
			var session = self.methodEditor.getSession();
			var line = session.getLine(cur.row);
			var chr1 = line[cur.column - 1];
			var chr2 = line[cur.column];
			//hide on up or down arrow	
			if (keyCode == 38 || keyCode == 40)
				$('#FunctionTip').hide();
			//hide when moving cursor beyond start of (
			if (keyCode == 37)
			{
				if (chr1 == '(')
					$('#FunctionTip').hide();
			}
			//hide when moving cursor beyond end of )
			if (keyCode == 39)
			{
				if (chr2 == ')')
					$('#FunctionTip').hide();
			}
			this.origOnCommandKey(e, hashId, keyCode);
		}
		this.findFilter = function(line)
		{
			return /[^\s;(),!\.]*$/.exec(line)[0];
		}
		this.filterLine = function(line)
		{
			
			line = $.trim(line);

			var filteredLine = "";
			for(var i = 0; i < line.length; i++)
			{
				if(line[i] !== " " && line[i] != "=" && line[i]!= ";")
				{
					filteredLine += line[i];
				}else
				filteredLine = '';

			}
			line = $.trim(filteredLine);
			var filter = /[^\s;(),\.\[=]*$/.exec(line);
			filter = filter[0];
			var value = line.substr(0,line.length - filter.length - 1)
			 
			var lineinfo;
			if(value)
			{
			lineinfo = {
				filter:filter,
				value:value
			}}else
			{
			lineinfo = {filter:value,value:filter}}
			
			lineinfo.trigger = line[lineinfo.value.length];

			if(lineinfo.value.match(/\s/))
			{
				lineinfo.value = /\s(\S*)$/.exec(lineinfo.value)[1]
			}
			return lineinfo;
		}
		window.filterLine = this.filterLine;
		$('#methodtext').on('click', function()
		{
			$('#FunctionTip').hide();
			$('#AutoComplete').hide();
		})
		this.methodEditor.on('blur', function(e)
		{
			$('#FunctionTip').hide();
			$('#AutoComplete').hide();
		});
		$(this.methodEditor.container).click(function()
		{
			$('#AutoComplete').hide();
		});
		self.methodEditor.setBehavioursEnabled(false);
	}
});