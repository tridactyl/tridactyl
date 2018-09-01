# Tridactyl v2

Why? Tridactyl was written with haste and has some tech debt to pay off. The main consequence of this debt is a general lack of reliability. A secondary consequence is embarassment in @cmcaine.

Aims:

1. Reduce mode related weirdness
2. Support tab local settings (tridactyl blacklist, different binds on different pages, unshadowing page binds, etc)
3. Support keyseq-style binds in all modes
4. Simplify messaging, modes and other core architecture to make future development simpler and more pleasant
    - Especially complicated stuff like completions, proper iframe support, eval, inline-editor, plugins, etc.

Method:

- Treat state more seriously
- Move state, parsers, etc to the content script
  - This makes tab-local state easier (mode, setl, etc)
  - Reduces messaging requirements
  - Simplifies key-processing code
  - @saulrh is working on this for v1
- Make modes easy to write
  - Define a new and better interface
  - improve mapping/config options
- Rationalise UI code (hints, cmdline, completions, statusline, statusindicator, errorbar, etc) into one framework in the popular react-ish style
  - Possibly make iframe interface synchronous
  - More predictable behaviour than each module manipulating the DOM willy nilly
  - @antonva is working on this for v1 and @glacambre has contributed some new completions
- Use new runtime-dispatch code instead of excmds_macros.py
  - @cmcaine: This already works, but it's still a bit clunkier than I'd like
  - Easier for other bits of the code to work without caring so much where it runs from
  - Macro code has odd requirements that contributors don't expect
  - Opportunity to improve and iterate on how we collect metadata from excmds, etc. for completions, documentation, validation, etc.
  - runtime-dispatch more easily extensible (hopefully, depends on --emitDecoratorMetadata)
- Stop using browser.storage event listeners for synchronising state and config
  - Ordering of these events with surrounding messaging code is undefined
  - Have to rewrite this anyway for move to content script
  - Performance issues
  - @saulrh is working on this for v1

## State

Tridactyl consists of a background process that lives about as long as the firefox process and a large number of client processes. Each content script and tridactyl page (newtab, help, tutorial) has one client process associated with it.

Each process maintains some state and some of that state must be synchronised to all processes. Some state is also serialised to disk via the storage API or native messenger.

If we consider all data used by Tridactyl to be part of the state, then the state of the client includes:

 - current mode
 - mode-specific state
   - keymaps
   - previously typed keys
   - for cmd-based modes (hint, search, cmd)
      - current cmdline
      - display related data
         - cmd history
         - completions
         - highlighted elements
         - index of currently selected element
 - the entire DOM of the current page

It's tricky to model Tridactyl as a function of state to output because the output is really the entire browser, seeing as we're a control system for it. We're an optional control layer on top of a complicated bit of software and what we're doing most of the time is just reaching in and asking Firefox to change *its* state.

So we should probably understand our output as being only the UI of Tridactyl: the visual interface and the data that comes in through keydown. That's fine except where our UI touches the DOM, as it does for hints. In those cases ############# we use I think we need to pull those DOM elements into our state and manipulate them from there - e.g. store an array of elements that match a hint string.

When we're working out which elements to hint (which involves querying the DOM about visibility and stuff) we should just consider that to be some unreliable external API call. In parti

Scrolling to update hints can be handled in the same way: we're listening on some API and it might tell us to update our data at some point.

In this brave new world, I want to try managing the state of the client in a redux-like store and actions model.

## Folder structure

```
src/
   webext/
      # feature code
      lib/
         # shared non-feature code
      pages/
         newtab/
            # Markdown, HTML, ts, css, etc
            # Probably best to just do this with JS, possibly in the style of gatsby?
            # That way when we want fancier pages they're easier to extend
         tutorial/
         help/
      assets/
         # css, images, etc

   native/
      # native python script

build/
   webext/
      # unpacked webextension
   native/
      # compiled native messenger

scripts/
   # build scripts

doc/
   # development documentation

artifacts/
   # xpis
   # links to native messenger
```
