# Launch posts

Drafts for the two launch waves in the plan. Replace `<URL>` with the live Vercel URL before posting.

Rules for every post, so the experiment stays clean:

- Do not say there are two layouts, what they are, or which one we hope wins. Saying "Lintmus runs a real Flagsmith
  experiment on itself" is fine; naming the arms is not (it changes how people behave).
- Never share a link with `?internal=1` or a `test-` identity, and never ask people to try it twice.
- Post the same link everywhere: the split is done by Flagsmith, not by the link.
- Discord: post only after a moderator says sharing a free tool with participants is OK.

## Wave 1 (as soon as the experiment is started, now expected Nov 27 evening IST)

### Discord (Toggle Wars server, after mod OK)

> Built a free tool for anyone wiring up Flagsmith experiments this week: **Lintmus**, a linter for Flagsmith
> experiment code.
>
> Most broken experiments don't crash. Events are switched off, an exposure is never recorded, or a metric name is one
> character off, and the dashboard just says "Collecting data". Lintmus catches those before you ship: paste your
> JS, TS or Python Flagsmith code and it shows each mistake, why it breaks the experiment, and a fix you can copy.
> Nothing you paste leaves your browser.
>
> Start with the puzzle: a snippet with 3 silent bugs. Can you fix them in 60 seconds?
> https://lintmus.vercel.app
>
> Lintmus is also my Track 1 entry, so it runs a real Flagsmith experiment on itself. Feedback on the 5 rules is very
> welcome, especially from the Flagsmith team.

### LinkedIn

> This Flagsmith experiment has 3 bugs. None of them throws an error. Can you find them in 60 seconds?
>
> That's the start screen of Lintmus, a small tool I built for the Flagsmith "Toggle Wars" hackathon. Broken A/B tests
> rarely crash. An SDK flag left off, an exposure that's never recorded, or a metric name that's one character off,
> and the experiment quietly collects nothing for two weeks.
>
> Lintmus reads your Flagsmith SDK code (JavaScript, TypeScript or Python) and points at each silent bug, explains
> what it does to the experiment, and gives you the fix. It runs entirely in your browser.
>
> And because it's a hackathon about experimentation, Lintmus runs a real, pre-registered Flagsmith experiment on
> itself. I'll publish the result, win or not.
>
> Try the puzzle: https://lintmus.vercel.app
>
> #featureflags #abtesting #flagsmith #webdev

### X

> This Flagsmith experiment has 3 silent bugs. No errors, it just records nothing. Find them in 60 seconds:
> https://lintmus.vercel.app
>
> Lintmus: a linter for experiment code. Runs in your browser, and runs a real pre-registered experiment on itself.
> Built for #ToggleWars by @flagsmith.

### IITM groups (WhatsApp / Discord)

> Quick favour: I built a 60-second debugging puzzle for a hackathon. 3 hidden bugs in a few lines of A/B test code.
> No signup, works on a phone. Try it: https://lintmus.vercel.app
> (Every visit counts for the experiment I'm running, so one try each is perfect.)

## Wave 2 (Nov 28, 19:00 IST, US morning)

### X / LinkedIn follow-up

> Day 2 of Lintmus: so far N people have tried the puzzle and the most missed bug is <bug>. Did you catch it?
> https://lintmus.vercel.app

Fill `N` and `<bug>` from the live data, and only use numbers that do not reveal arm results (total visitors, the
most missed rule). Do not post anything about which layout is ahead: that is peeking in public, and the pre-registration
forbids early decisions.

### Discord follow-up

> Thanks to everyone who tried Lintmus yesterday, and for the rule feedback: it is collected in the repo and goes in
> after the experiment ends (the rules are frozen while it runs). The puzzle is still open if you have not had a go:
> https://lintmus.vercel.app
