# Reformed Commentaries app

Garry works on this app from two places: the MacBook Air, in
~/Documents/commentaries/unified, and the iPhone, through Claude Code sessions in the cloud.
Both sides publish straight to `main` on GitHub (gblaettel-star/reformed-commentaries), and GitHub Pages serves it.
These rules keep the two sides from mixing each other's work up.

## Working together from the Mac and the iPhone

1. **Start from the latest.** Run `git pull` before the first edit of a session.
   - Run it again before starting a new piece of work if the session has been open a while.
   - The SessionStart hook does this when a session opens in this folder.
2. **Publish each finished change promptly** with `./publish.sh <message-file>`.
   - Don't leave edits unpublished for hours: the other side can't see them, and they become the ones that clash.
3. **Always publish with publish.sh, never by hand.** It:
   - pulls what the other side published;
   - rebuilds the search index;
   - bumps the `sw.js` version and stamps the scripts from that latest state;
   - pushes, and retries if the other side published in the meantime.
   A hand-made commit skips this and causes duplicate version numbers.
4. **If publish.sh says the edits clash, stop and tell Garry.**
   - Nothing was published, and the edits are still in the working folder, unchanged.
   - Pull, look at what the other side changed in the same place, and redo the edit on top of it.
   - Never force-push, and never overwrite the other side's change to make the clash go away.
5. **Work on `main`.** Don't leave work on a side branch, because GitHub Pages only serves `main`.
6. **Generated files** (`search/`, the version in `sw.js`, and the `?v=` stamps in the pages) are made by publish.sh.
   Don't edit them by hand.

## Mac only: iCloud

The real folder is `~/Documents/commentaries/unified.nosync`, and `unified` is a shortcut to it.
- The `.nosync` ending keeps iCloud from syncing it or offloading its files. GitHub is the sync.
- The git store inside it is `.git.nosync`. `.git` is a one-line pointer to it.
- If a command ever hangs on an offloaded file, list them with `find . -flags +dataless`.
  - Replace each one with `git show HEAD:<file> > <file>.tmp`, then `mv` it over the original.
