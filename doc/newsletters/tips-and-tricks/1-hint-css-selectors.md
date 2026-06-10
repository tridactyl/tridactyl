# Tridactyl Tips & Tricks 1: Hint mode CSS selectors

Hi!

Welcome to the first Tridactyl Tips & Tricks newsletter, as mentioned in the previous Tridactyl newsletter. This newsletter is very experimental so any feedback you have would be appreciated.

This first edition is going out to all sponsors on GitHub and Patreon. Later editions will only go out to sponsors on tiers **10 USD a month and higher**; I'm trying to raise a bit more revenue since GitHub will no longer double donations. I'll probably make each newsletter public after a couple of months as I don't like restricting knowledge needlessly, but I want there to be some incentive other than warm fuzzy feelings for people to donate money to Tridactyl. My initial plan is to write a chunky guide like this about once a month - planned topics include custom ex-commands with `:js` and `:jsb`, `:composite` and custom themes - and once I run out of big ideas I'll send out shorter emails with more random tips & tricks more often.

In my experience, most people who use Tridactyl know a lot about computers in general, but don't know much about web technologies. These guides therefore will assume very little knowledge about JavaScript or the working of websites. They may assume some rudimentary knowledge of programming terminology. Please do let me know if I'm getting the balance right!

I wasn't sure where to start with the tips so I've gone for one of the features of Tridactyl I use most frequently: custom hint modes that use custom CSS selectors to only show the most relevant hints on your favourite websites; for example, on a search engine you might only want search results to be hinted. Essentially, we'll learn how to create lines like the following ones from my RC file.

```
" Only hint search results on Google and DDG
bindurl www.google.com f hint -Jc .rc > div > a
bindurl www.google.com F hint -Jbc .rc > div > a

bindurl ^https://duckduckgo.com f hint -Jc [class=result__a]
bindurl ^https://duckduckgo.com F hint -Jbc [class=result__a]


" Comment toggler for Reddit, Hacker News and Lobste.rs
bind ;c hint -Jc [class*="expand"],[class="togg"],[class="comment_folder"]
```

![Left: full hints on a Google result page. Right: custom hints which only highlight results](https://raw.githubusercontent.com/tridactyl/tridactyl/606cfc581364ce09d7d197263506f544e8d1d470/doc/newsletters/tips-and-tricks/assets/1-google-hint-comparison.png)

We'll cover quite a lot of ground here so bear with me:

1. What a CSS selector does and why it's useful for hint modes
2. How to craft a CSS selector that only contains the links you want
3. Using this CSS selector in various hint modes
4. Binding these hint modes to keys
5. Binding these hint modes to keys only on certain websites

If you already know how to do any of those steps you can just skip the corresponding section.

Without further ado:

# 1: Introduction to CSS selectors and why they're useful for hint modes

CSS - "cascading style sheets" - control how a web page is displayed. Here is a simple CSS snippet:

```css
p {
    color: pink;
}
```

This file would make all the paragraphs (the `<p>` tags) on the page pink.

Why do we care about this? The bit before the curly bracket - `p` - is a CSS selector. It tells the browser which parts of the page to apply the following styles to. Tridactyl can use this same technology to pick which elements of a page to hint with the syntax `:hint -c [CSS selector]`. For reasons of backwards compatibility, this also includes hints for any elements for which the page is listening for mouse click events with JavaScript; you can turn this off with the `J` flag so in practice you will usually see this invoked as `:hint -Jc [CSS selector]`. Selectors can be combined with some but not all hint modes - we will cover them in section 3.

MDN has an excellent tutorial on CSS selectors here: https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Selectors . I highly recommend that you take the time to go through it.

# 2: How to craft a CSS selector that only contains the elements you want

In this section we'll make use of the Firefox web console to help us to find an initial CSS selector that selects the elements we want to hint and then improve it.

If you skipped the MDN tutorial above, you can get by in this section by knowing that websites generally denote "types" of element with classes, e.g. `<p class="advertorial">` might denote text that has been written by a sponsor. CSS selectors select classes with a leading dot, e.g. `.advertorial`. Tags are selected simply with the name of the tag and can be combined with other selectors, e.g. `p.advertorial`. The next important thing to know is that you can select direct children of other selectors with the child operator, `>`. So, if there were any `<a>` tags (i.e. links) within the advertorial, we can select them with `p.advertorial>a`. In sum, then, a hint mode for clicking on links within advertorials would be `:hint -Jc p.advertorial>a`.

With that out of the way, let's look at how to use the Firefox developer tools to craft the best CSS selector for your elements. For this example, I'll pretend that I want to hint the main articles on the [English Wikipedia homepage](https://en.wikipedia.org/wiki/Main_Page). Right click on one of the elements you want to hint and click "Inspect Element". A panel should appear; you want to look at the HTML panel and see if there is any discernible pattern to the tags surrounding the element you are interested in. Right click another element you want to hint and check that it is the same. For example, for me, the HTML looks a bit like this:

```
<p>
    <b>
        <a href="/wiki/James_Humphreys_(pornographer)" title="James Humphreys (pornographer)">James Humphreys</a>
    </b>
...
<li>
::marker
    <b>
        <a href="/wiki/Hurricane_Iota" title="Hurricane Iota">Hurricane Iota</a>
    </b>
...
```

![Wikipedia's main page with the Firefox developer tools open](https://raw.githubusercontent.com/tridactyl/tridactyl/606cfc581364ce09d7d197263506f544e8d1d470/doc/newsletters/tips-and-tricks/assets/1-wiki-inspect-element.png)

It looks like the links I want to hint are always directly enclosed by a `<b>` (bold) tag. The CSS selector we want is therefore `b>a`, that is links (`a` tags) which are immediate children of bold tags. We can check that this works in Tridactyl by giving focus to the webpage again, and typing `:hint -c b>a` - and, if it works, we're done!

![Left: full hints on the Wikipedia homepage. Right: custom hints which only highlight major articles](https://raw.githubusercontent.com/tridactyl/tridactyl/606cfc581364ce09d7d197263506f544e8d1d470/doc/newsletters/tips-and-tricks/assets/1-wiki-hint-comparison.png)

However, what if it didn't work? What if there were too many links hinted or not enough? I have found that the best way to proceed is to go to the Firefox console. On the panel that displays the HTML, click the "console" tab. In this tab, type

```
document.querySelectorAll("[your selector here]")
```

and press enter. So, for me, `document.querySelectorAll("b>a")`. You should see that a `NodeList` has been returned. If you click the little arrow/triangle next to this, it will expand and you can see all the elements that your selector matches (including ones not visible in the viewport).

If your selector has not matched the elements you want - and you can see which is which easily by hovering over them with the mouse and they will be highlighted in the viewport - you need to return to the previous step and make your CSS selector less restrictive. For example, we might change our selector from `b>a` to `a` - removing the restriction that `a` tags have to be inside `b` tags and instead selecting all `a` tags.

If instead your selector has matched too many elements, we need to tighten our CSS selector. If you can see a pattern that the elements you want follow but the elements that you don't want do not, use it. Let's say that on the Wikipedia page I don't want to hint any of the important links that go to external pages.

My NodeList looks like this:

```
NodeList(57)
0: <a class="" href="/wiki/James_Humphreys_(pornographer)" title="James Humphreys (pornographer)">
1: <a class="" href="/wiki/James_Humphreys_(pornographer)" title="James Humphreys (pornographer)">
...
55: <a class="external text" href="https://en.wikivoyage.org/">
56: <a class="external text" href="https://en.wiktionary.org/">
```

![The Firefox developer console after running the query selector](https://raw.githubusercontent.com/tridactyl/tridactyl/606cfc581364ce09d7d197263506f544e8d1d470/doc/newsletters/tips-and-tricks/assets/1-wiki-console.png)

where the first two links are ones I want and the last four are ones I want to exclude.

There are two patterns that I can spot: the links we want always have their hrefs start with `/wiki/`, and the links we don't want have `class="external text"`.

At this point it's helpful to have a working knowledge of the more advanced CSS selectors. Particularly, we will use [attribute selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors).

Since there are two patterns which completely specify the items we want and don't want, there are two possible CSS selectors. The first is relatively straightforward: `b>a[href^='/wiki/']`, meaning any `a` tags whose hrefs start with "/wiki/" and are the immediate children of `b` tags. The second is a little more complex as it requires a negation: `b>a:not([class^="external"])` - it matches all `a` tags whose classes don't start with "external" and are immediate children of `b` tags. We can verify that these work again with `:hint -c [CSS selector]` in Tridactyl or `document.querySelectorAll("[CSS selector]")` in the Firefox console.

For the special case where there is a single link that you would like to hint, you can use Tridactyl to create a unique selector automatically. Simply run `hint -F e => tri.excmds.fillcmdline("hint -Jc " + tri.dom.getSelector(e))` and Tridactyl will return a hint command for you to run or edit.

Finally, we will cover what to do if there appears to be no difference between the elements you want and the elements don't want in your `NodeList`: you need to look at the tags surrounding the elements. To do that, you can click on the "crosshair" like icon to the right of each element. This will take you back to the HTML representation of the page with your element selected. You then need to repeat the step we did initially, looking to see if you can spot any patterns. You can click the "console" tab to get back to the `NodeList` and look at other elements. If you're still stuck after all this, feel free to ask us on Matrix; there's usually a way to do it.

# 3. Using CSS selectors in more hint modes

There are a couple of gotchas to using anything other than the standard `:hint -c` hint mode. It can currently only be used on the default, foreground tab (`-t`), background tab (`-b`) and custom callback (`-F`) hintmodes.

The main caveat is that you can't put any spaces in the CSS selector if your mode also takes other arguments. E.g. `:hint -Fc b > a console.log` will not work: you need `:hint -Fc b>a console.log`. This means that CSS selectors that require spaces can't be used with these hint modes unless you start the hint mode via `:js` (which will be covered in a later newsletter ; )). If the mode takes other arguments, the selector always comes first.

# 4. Binding the hint mode to keys

I imagine most people reading this newsletter will already know how to bind to keys. I include it here for completeness.

`:bind [key sequence] hint -c [CSS selector]`, so for our Wikipedia example, we might choose `:bind ,f hint -c b>a`. See `:help bind` in Tridactyl for more information on key sequences.

# 5. Binding hint modes to keys only on certain websites

Custom hint modes like the ones we have covered here are usually specific to a single website. It therefore often makes sense to only bind the modes to keys when you are on these websites. Tridactyl has a `:bindurl` command for situations exactly like these.

The full syntax is `:bindurl [URL regex] [key sequence] [ex-command]`. If you are unfamiliar with JavaScript regex, you may find [this MDN page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) useful. Note that `:bindurl` converts the regex string to a regex, i.e. you should not surround your regex with slashes, so `\.xml$` rather than `/\.xml$/`. However, most of the time you don't really need to worry about bindurl using a regex. `:bindurl www.google.com ,c tabclose` will match "www.google.com" fine, but it will also match any URL that contains "www.google.com" and the dots `.` can actually match any letter, e.g. "wwwagooglezcom" would also match. In the real world this doesn't matter much, but if you are concerned about it you can use `^http(s)?://www\.google\.com` which will only match literal dots and only URLs that start with `google.com`.

So, for our Wikipedia example, we might use

```
bindurl http(s)?://en\.wikipedia\.org/wiki/Main_Page ,f hint -c b>a`
bindurl http(s)?://en\.wikipedia\.org/wiki/Main_Page ,F hint -bc b>a`
```

where we have bound the new modes to `,f` and `,F`. If we wanted to "replace" the normal hint modes on these pages, we would just bind to `f` and `F` instead.

# Conclusion

I hope you have enjoyed this first tips & tricks newsletter. Please do send me feedback - whether it's via Matrix, GitHub issues or email - so I can get an idea on how useful this was. Was it too long? Was the topic interesting? Was it too easy, or too hard? How frequently do you think they should be sent?

Cheers, bovine3dom
