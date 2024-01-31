// ==UserScript==
// @name         AO3 Bookmarker
// @namespace    http://tampermonkey.net/
// @version      2024-01-28
// @description  bookmarker for AO3 with extra buttons and stuff
// @author       JGladeling
// @match        *archiveofourown.org/works/*
// @match        *archiveofourown.org/series/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////
////////////////////////// Controls ///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

////////////////////// General ////////////////////////////////////////////////

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
const dateLang = 'en-us';
const dateFormat = { weekday:"long", year:"numeric", month:"short", day:"numeric"};


////////////////////// Auto Comment ///////////////////////////////////////////

const autoCommentEnabled = true;
const autoCommentDoubleClick = true;
const autoCommentAutoPost = false;
const autoCommentDelay = 500;
const autoCommentAddFooter = false;
const autoComments = Array(
    "Extra Kudos <3 ",
    "This is an extra kudos, since I've already left one. :) ",
    "I just wanted to leave another kudos <3 ",
    "Kudos! ♥ ",
    "I loved this! ",
    "This was great!! ♥ ",
    "♥ ♥ ♥ ",
    "LOVE LOVE LOVE! ",
    "<3 <3 <3 ",
    "This is great!! ♥ ",
    "Loved this <3 ",
    "♥ ",
    "Thank you for sharing this!",
    "Oh hell yeahhhh",
    "Oh hell yeahhhh!",
    "Kudos ♥ ",
    "I loved this so much I reread it and now im leaving an extra kudos! ",
    "Kissing you on your forehead kudos ",
    "Kissing you on your forehead, MWAH ",
    "Reread kudos :) ",
    "Reread kudos <3 ",
    "Reread kudos ♥ "
);


////////////////////// Bookmark helper ////////////////////////////////////////

const bookmarkHelperEnabled = true;
// Array is iterated and if the following condition is meet it applies that tag and stops:
//     if (wordCount < bookmarkHelperSizeMapping[i][0])      where i is the iterator
const bookmarkHelperSizeMapping = Array(
    [10000, "Wordcount: Under 10.000"],
    [30000, "Wordcount: 10.000-30.000"],
    [50000, "Wordcount: 30.000-50.000"],
    [100000, "Wordcount: 50.000-100.000"],
    ["default" , "Wordcount: Over 100.000"],
)
const bookmarkHelperTagsEnabled = true;
const bookmarkHelperMarkPrivate = true;


///////////////////////////////////////////////////////////////////////////////
/////////////////////////// Details functions /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function getFicDetails() {
    // Use regex to capture id(s) from pathname which looks like:
    //   * /works/123                  <- 1 capture groups: idMatch[1] (123)    - These are for fics with NO chapters
    //   * /works/123/chapters/456     <- 2 capture groups: idMatch[1] (123)    - These are for fics with chapters
    //                                                      idMatch[2] (456)
    // See https://regex101.com/ for help with these
    const idMatch = window.location.pathname.match(/\/works\/(\d+)(?:\/chapters\/(\d+))?/);
    if (idMatch == null) {
        console.log("Unable to parse fic details");
        return null;
    }

    const id = idMatch[1];
    const chapterId = idMatch[2];  // This will be null if a fic with NO chapters

    const title = document.getElementsByClassName("title heading")[0].innerText;

    ///////////////////////////////////
    // Notes on next section
    ///////////////////////////////////
    //
    //     Fics are well formed and have nice tags on them that enable directly querying for them
    //     The tags are generally as follows:
    //         <dt class="rating tags"> Rating: </dt>
    //         <dd class="rating tags">Mature</dd>
    //     The <dd ...> one can be fetched and the innerText (Mature) grabbed
    //
    //     For sections which have multiple possible values:
    //         <dd class="relationship tags">
    //           <ul class="commas">
    //             <li>
    //               <a class="tag" href="...">Hermione Granger/Draco Malfoy</a>
    //             </li>
    //           </ul>
    //         </dd>
    //     The <dd ...> can be fetched and queried for the individual list items (<li>) and the innerText (Hermione Granger/Draco Malfoy) grabbed
    //
    //     A little JS magic is used to make these fit on a single line, but it breaks down as such
    //         1. Get the top level HTML element
    //         2. Optionally query for sub-elements (if multiple possible)
    //              ?.querySelectorAll() ?? []    Will run the query if not empty else default to an empty Array
    //         3. If multiple possible create an Array from all the elements or empty Array
    //         4. Run a function to get the innerText on each element in the Array
    //              .map(function (element) { return element.innnerText})
    //              For example:
    //                  [ <li>First</li>, <li>Second</li> ].map(...)  =>  [First, Second]
    //
    //     Anywhere you see ? means it is possible for it to not be present and that case must be handled
    //         Use a ternary (google it) to handle if it is present or not

    const authors = Array.from(document.querySelectorAll('[rel="author"]')).map(function(auth) { return auth.innerText; });

    const rating = document.querySelector('dd.rating.tags').querySelector('li').innerText;

    const warnings = Array.from(document.querySelector('dd.warning.tags')?.querySelectorAll('li')).map(function (warn) { return warn.innerText });

    const categories = Array.from(document.querySelector('dd.category.tags')?.querySelectorAll('li') ?? []).map(function (cat) { return cat.innerText });

    const fandoms = Array.from(document.querySelector('dd.fandom.tags').querySelectorAll('li')).map(function (fan) { return fan.innerText });

    const relationships = Array.from(document.querySelector('dd.relationship.tags')?.querySelectorAll('li') ?? []).map(function (rel) { return rel.innerText });

    const characters = Array.from(document.querySelector('dd.character.tags')?.querySelectorAll('li') ?? []).map(function (char) { return char.innerText });

    const additonalTags = Array.from(document.querySelector('dd.freeform.tags')?.querySelectorAll('li') ?? []).map(function (tag) { return tag.innerText });

    const language = document.querySelector('dd.language').innerText;

    // Stats section
    const stats = document.querySelector('dd.stats');

    const publishedOn = stats.querySelector('dd.published').innerText;
    const updatedOn = stats.querySelector('dd.status')?.innerText;
    const words = parseInt(stats.querySelector('dd.words').innerText.replaceAll(/\s|,/g, ""));  // Remove spaces and commas
    const publishedChapters = parseInt(stats.querySelector('dd.chapters').innerText.split('/')[0]);
    const totalChapters = stats.querySelector('dd.chapters').innerText.split('/')[1];
    const numComments = parseInt(stats.querySelector('dd.comments')?.innerText ?? 0);
    const numKudos = parseInt(stats.querySelector('dd.kudos')?.innerText ?? 0);
    const numBookmarks = parseInt(stats.querySelector('dd.bookmarks')?.innerText ?? 0);
    const numHits = parseInt(stats.querySelector('dd.hits').innerText);


    const summary = document.getElementsByClassName('summary')[0].getElementsByTagName('blockquote')[0].innerText;

    return {
        type: "fic",
        id: id,
        chapterId: chapterId,
        title: title,
        authors: authors,
        rating: rating,
        warnings: warnings,
        categories: categories,
        fandoms: fandoms,
        relationships: relationships,
        characters: characters,
        additonalTags: additonalTags,
        language: language,
        stats: {
            publishedOn: publishedOn,
            updatedOn: updatedOn,
            words: words,
            chapters: {
                published: publishedChapters,
                total: totalChapters,
            },
            comments: numComments,
            kudos: numKudos,
            bookmarks: numBookmarks,
            hits: numHits,
        },
        summary: summary,
    }
}

function getSeriesDetails () {
    // Use regex to capture id(s) from pathname which looks like:
    //   * /series/123        <- 1 capture groups: idMatch[1] (123)
    // See https://regex101.com/ for help with these
    const idMatch = window.location.pathname.match(/\/series\/(\d+)/);
    if (idMatch == null) {
        console.log("Unable to parse series details");
        return null;
    }

    const id = idMatch[1];

    const title = document.getElementsByTagName("h2")[0].innerHTML.trim();

    const creators = Array.from(document.querySelectorAll('[rel="author"]')).map(function(auth) { return auth.innerText; });

    ///////////////////////////////////
    // Notes on next section
    ///////////////////////////////////
    //
    //     Series are not well formed, basically need to search for the exact section
    //         Xpaths are not great
    //
    //     Anywhere you see ? means it is possible for it to not be present and that case must be handled
    //         Use a ternary (google it) to handle if it is present or not

    const begunOnPath = "//dt[text()='Series Begun::']/following-sibling::dd[1]";
    const begunOn = document.evaluate(begunOnPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerText;

    const updatedOnPath = "//dt[text()='Series Updated:']/following-sibling::dd[1]";
    const updatedOn = document.evaluate(updatedOnPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.innerText;

    const descriptionPath = "//dt[text()='Description:']/following-sibling::dd[1]";
    const description = document.evaluate(descriptionPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.innerText;

    const notesPath = "//dt[text()='Notes:']/following-sibling::dd[1]";
    const notes = document.evaluate(notesPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.innerText;

    const wordsPath = "//dt[text()='Series Updated:']/following-sibling::dd[1]";
    const words = parseInt(document.evaluate(wordsPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerText.replaceAll(/\s|,/g, ""));

    const worksPath = "//dt[text()='Works:']/following-sibling::dd[1]";
    const works = parseInt(document.evaluate(worksPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerText);

    const isCompletePath = "//dt[text()='Complete:']/following-sibling::dd[1]";
    const isComplete = document.evaluate(isCompletePath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerText == 'Yes';

    const numBookmarksPath = "//dt[text()='Bookmarks:']/following-sibling::dd[1]";
    const numBookmarks = parseInt(document.evaluate(numBookmarksPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.innerText ?? 0);

    return {
        type: "series",
        id: id,
        title: title,
        creators: creators,
        begunOn: begunOn,
        updatdOn: updatedOn,
        description: description,
        notes: notes,
        stats: {
            words: words,
            works: works,
            complete: isComplete,
            bookmarkss: numBookmarks
        }
    }
}


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Auto Commenter ////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function addAutoComment(details) {
    // Get random comment from provided comments
    var comment = autoComments[Math.floor(Math.random() * autoComments.length)];

    // Append footer if requested
    if (autoCommentAddFooter) {
        const commentDate = (new Date()).toLocaleDateString(dateLang, dateFormat);
        comment += "<br></br><sub>Sent with love from the rekudos machine on " + commentDate + "</sub>"
    }

    // Find comment fields: chapterId may be null if fic doesn't have chapters
    var id;
    if (details.chapterId) {
        id = details.chapterId;
    } else {
        id = details.id;
    }
    const commentField = document.getElementById("comment_content_for_" + id);
    const commentButton = document.getElementById("comment_submit_for_" + id);

    // Add comment and submit
    commentField.value = comment;
    if (autoCommentAutoPost) {
        commentButton.click();
    }
};


function registerAutoCommenter(details) {
    // Get kudo button
    const kudoButton = document.getElementById('new_kudo');

    //TODO: What if they have already left kudos and refreshed page?

    if (autoCommentDoubleClick) {
        // If 2 clicks is required then need to add another listener
        function secondClickAutoCommter() {
            // Change kudos button text
            const kudoButtonText = document.querySelector('#kudo_submit');
            kudoButtonText.value = "Auto Comment";

            // Run addAutoComment function when button is clicked again
            kudoButton.addEventListener("click", function () {
                addAutoComment(details);
            });
        }

        // Run above function after kudo button is clicked
        kudoButton.addEventListener("click", function() {
            setTimeout(secondClickAutoCommter, autoCommentDelay);
        });
    } else {
        // Run addAutoComment function when kudos is clicked
        kudoButton.addEventListener("click", function() {
            addAutoComment(details)}
        );
    }
}


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// Bookmark helper ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function createBookmarkNotes(details) {
    var notes = "";
    switch(details.type) {
        case 'fic':
            notes = "<details><summary>" + details.type + " Info</summary><b>" + details.title + " by " + details.authors.join(', ') + "</b> (Fic" + details.id + ")"
            notes += "<blockquote>Summary: " + details.summary + "</blockquote>"
            notes += "</details>"

            return notes
        case 'series':
            notes = "<details><summary>" + details.type + " Info</summary><b>" + details.title + " by " + details.creators.join(', ') + "</b> (Series" + details.id + ")"
            if (details.description) {
                notes += "<blockquote>Description: " + details.description + "</blockquote>"
            }
            notes += "</details>"

            return notes
        default:
            return "Unknown type: " + details.type;
    }
}

function createBookmarkTags(details) {
    var tags = "";

    // Wordcount tag
    for (const spec of bookmarkHelperSizeMapping) {
        if (typeof spec[0] === 'number') {
            if (details.stats.words < spec[0]) {
                tags += spec[1];
                break;
            }
        } else {
            tags += spec[1];
            break;
        }
    }

    return tags;
}

function addBookmarkNotes(details) {
    document.getElementById("bookmark_notes").innerText = createBookmarkNotes(details);

    document.getElementById("bookmark_private").checked = bookmarkHelperMarkPrivate;
}

function addBookmarkTags(details) {
    const tagInputBox = document.querySelector('.input #bookmark_tag_string_autocomplete');
    tagInputBox.value = createBookmarkTags(details);
}


///////////////////////////////////////////////////////////////////////////////
////////////////////////////// Main ///////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function main() {
    // Get details of page
    var details;

    if (window.location.pathname.includes('/works/')) {
        details = getFicDetails();
    } else if (window.location.pathname.includes('/series/')) {
        details = getSeriesDetails();
    } else {
        console.log("Unknown bookmark-able location: " + window.location.pathname);
        return;
    }

    // Auto commenter
    if (details.type === 'fic' && autoCommentEnabled) {
        registerAutoCommenter(details);
    }

    // Bookmark helper
    if (bookmarkHelperEnabled) {
        addBookmarkNotes(details);

        if (bookmarkHelperTagsEnabled) {
            addBookmarkTags(details);
        }
    }
}

main();
