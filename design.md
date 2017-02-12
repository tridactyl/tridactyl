# Webextension modules we might need:

* keyboard (not yet existent)
* storage (.vimperatorrc)
* tabs
* history (for auto completion of open, etc)
* bookmarks (auto completion, obvious)
* windows (buffers)
* webNavigation (autocmds) - maybe content script would just do this for us.

## Stuff we want to do that I know how to do:

Show hints:
	For each link in viewport (how to restrict to viewport?):
		Add a <p> element styled to appear on top of it
		Listen for keystrokes.
	Does vimperator just go for <a> tags? I think it probably knows about elements that can be clicked for other effects.
Change tab
	tabs.update(tabtodisplay, {active: true})
Change window focus
	windows.update(windowtofocus, {focused: true})

## Stuff I don't know how to do:

Use promises properly.
Use promises from a sane language (coffeescript, livescript, elm, etc).
Find promises to cancel their chain.
Communication between background and content scripts.
