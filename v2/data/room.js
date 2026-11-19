/* ============================================================
   v2 — data/room.js
   What the crowd holds up, shouts, and what the announce desk says.
   Data only — edit freely.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};

  /* signs: "for" = goes up when that wrestler is being cheered;
     "against" = goes up when that wrestler is being booed;
     neither = goes up whenever the room is loud. */
  PCW.SIGNS = [
    { text: ["STOVE", "HOT!"], for: "stove" },
    { text: ["TURN", "IT UP"], for: "stove" },
    { text: ["HE'S", "COOKIN'"], for: "stove" },
    { text: ["STILL", "HOT"], for: "stove" },
    { text: ["OFFICE", "STOOGE"], against: "boulder" },
    { text: ["PEBBLE"], against: "boulder" },
    { text: ["THE", "CHAMP"], for: "boulder" },
    { text: ["SOLID", "GOLD"], for: "boulder" },
    { text: ["GONE", "COLD"], against: "stove" },
    { text: ["ROW", "12"] },
    { text: ["HI", "MOM"] },
    { text: ["I SKIPPED", "WORK"] },
    { text: ["PCW"] }
  ];

  PCW.CHANTS = {
    stoveLoved: ["LET'S GO STOVE!", "STOVE! STOVE! STOVE!"],
    stoveHated: ["STOVE'S GONE COLD!", "GO HOME STOVE!"],
    boulderHated: ["BOUL-DER SUCKS!", "OFFICE STOOGE!"],
    boulderLoved: ["BOUL-DER! BOUL-DER!"],
    bored: ["BOR-ING!", "DO SOMETHING!"],
    great: ["P-C-W! P-C-W!", "ONE MORE TIME!"]
  };

  PCW.SHOUTS = {
    pop: ["YEAH!", "WOO!", "YES!", "C'MON!"],
    boo: ["BOO!", "BOOO!", "BOOOO!"],
    weak: ["c'mon", "huh?", "pfft"],
    seen: ["seen it", "again?"],
    endit: ["end it", "get on with it"]
  };

  PCW.LINES = {
    bell: "And there's the bell! We are underway at PCW GRANDSTAND!",
    strike: ["Big chop! You could hear that in the cheap seats.", "He's lighting him up!"],
    weak: ["That one didn't look like much, Chet.", "He barely felt that."],
    slam: ["Scoop and a slam!", "Up and DOWN he goes!"],
    armdrag: ["Arm drag! He slipped right out of it!", "Reversed, and over he goes!"],
    clothesline: ["CLOTHESLINE! He nearly took his head off!"],
    corner: ["Into the corner! He hit those buckles hard.", "Sent to the corner, and he's hung up there!"],
    tackle: ["Shoulder tackle off the ropes! He ran right through him!"],
    stomp: ["He's putting the boots to a man who's down.", "That's just mean."],
    nosell: ["He popped right back up! That made the other fella look like nothing."],
    burner: "THE FRONT BURNER! He got all of it!",
    landslide: "THE LANDSLIDE! The champion plants him!",
    kickout: ["HE KICKED OUT! I do not believe it!", "Two and a half! So close!"],
    cover: ["He hooks the leg!", "Cover! The referee is down!"],
    turnOnStove: "Listen to that, Chet. They're turning on Stove Hot.",
    winBackStove: "They're back behind Stove Hot!",
    cheerBoulder: "Are they... cheering The Boulder? The office won't believe it.",
    booBoulder: "And there go the boos again for the champion.",
    sitBack: "They're sitting on their hands. Somebody change something up.",
    leanIn: "Look at the front row. They are hanging on every move.",
    cleanWin: "ONE, TWO, THREE! We have a NEW CHAMPION!",
    flatWin: "Three? That's it? That came out of nowhere.",
    screwjob: "The champion gets three! That is NOT how this was supposed to go!",
    shoot: "HE KICKED OUT?! He was not supposed to do that!",
    breakdown: "This has fallen apart. These two are not working together at all."
  };

  PCW.GORILLA = {
    start: "Stove goes over with the Front Burner. Give them a story first.",
    home: "Start taking it home.",
    now: "GO HOME. Front Burner, one two three.",
    over: "You are way over. Finish it NOW.",
    shoot: "That was the FINISH. What is he doing?!",
    nosell: "Stay down when you take a bump. You made him look weak."
  };
})();
