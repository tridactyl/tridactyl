 # Tridactyl changelogs

 ## Release 1.7.0

 - History completion is massively improved: much faster, more relevant results, and less janky as you type.
 - User configuration
     - set [setting] without a value will inform you of the current value
     - Add configuration options for hinting: `hintchars` and `hintorder`
     - Add unset for resetting a bind to default
     - You can now change default search engine with e.g, `set searchengine bing` (#60)
     - The default new tab page can be replaced with any URL via `set newtab [url]` (#59)
     - Add `gh` and `gH` and "homepages" setting (#96)
 - Shift-tab and tab now will cycle around completions correctly
 - `ys` now works on some older pages
 - Add bmarks command for searching through bookmarks (#167)
 - Add `hint -c [selector]`: add hints that match CSS selector
 - Add text-to-speech hint mode on `;r`
 - Allow `;p` to yank any element which contains text
 - Add `;#` hint yank anchor mode
 - Improve hint CSS by adding a border and making background semi-transparent
 - Add `tabonly` command
 - Fix hinting mysteriously not working on some pages (#168)
 - Fix issue where command line would invisibly cover up part of the screen (#170)
 - Bookmarks can now have spaces in their titles
 - Fix some hints on sites such as pcgamer.co.uk
 - Long page titles will no longer appear after URLs in completions
