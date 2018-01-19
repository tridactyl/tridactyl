# Tridactyl changelogs

## Release 1.7.3

- Hint tags are much better:
    - Hint tags are now as short as possible
    - Remove now disused `hintorder` setting
- Add `.` to repeat last action
- Add inputmode: `gi` and then `Tab` will cycle you between all input fields on a page
- Add hint kill submode `;k` for removing elements of a webpage such as dickbars
- Add relative zoom and `z{i,z,o}` binds
- Add `sanitize` excmd for deleting browsing/Tridactyl data
- Search engines:
    - Add `searchsetkeyword [keyword] [url]`: define your own search engines (#194)
    - Add Qwant and update startpage URL (#198)
    - Add Google Scholar search engine
- Fix problems where ignore mode would revert to normal mode on some websites with iframes (#176)
- Add ^ and $ in normal mode for navigation to 0% or 100% in x-direction
- Buffer completion fixes
    - Use tab ID even if buffer has a trailing space (#223)
    - completions: passthrough # in buffercompletion
- Support multiple URLs for quickmarks
- Blacklist default newtab url from history completions
- Fix `set newtab` failing to set newtab
- Add `q`, `qa`, and `quit` synonyms
- Fix `unset` failing to take effect without reloading page
- Minor improvements to `help` preface
- Add <summary> tags to standard hinting
- Log an error to browser console if no TTS voices are found


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
