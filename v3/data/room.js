/* ============================================================
   v3 — data/room.js
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
    charge: ["He ran right through him in the corner!", "Squashed against the buckles!"],
    outside: ["Over the top and out to the floor!", "He just threw him out of the ring!"],
    apron: ["Back-first into the edge of the ring! That is the hardest part of it."],
    dive: "HE FLEW THROUGH THE ROPES! Both men are down on the floor!",
    crash: ["NOBODY HOME! He moved, and that man hit nothing!", "He crashed and burned!"],
    elbow: "OFF THE TOP ROPE! He came down with everything he had!",
    cutoff: ["And just like that, the champion shuts it down.", "He had him going, Chet, and he got cut off."],
    comeback: ["HERE HE COMES! He's firing back!", "He's fighting out of it!"],
    countout: "TEN! The referee has counted them out. That is no way to end it.",
    rake: ["A thumb to the eye! Where is the referee?", "That is a cheap shot, and he knows it."],
    bail: ["He wants no part of it! The champion is taking a walk.", "He's bailing out. Listen to this crowd."],
    feet: "His FEET are on the ROPES! Look at his feet, referee!",
    caught: "The referee SAW it! He stops the count!",
    warn: ["The referee has had enough of that. That's a warning.", "He's being told: one more and it's over."],
    dq: "He's calling for the bell! That is a disqualification!",
    suplex: ["SUPLEX! He held him up there for everyone to see.", "Up, over, and down!"],
    backbreaker: ["BACKBREAKER! Right across the knee!"],
    spinebuster: ["SPINEBUSTER! He drove him through the mat!"],
    dropkick: ["Dropkick! Right on the button.", "What a dropkick!"],
    forearm: ["A forearm smash, and down he goes."],
    backdrop: ["Back body drop! He went ten feet in the air!"],
    bigboot: ["BIG BOOT! He ran right into it!"],
    post: ["INTO THE RING POST! That is solid steel, Chet."],
    limb_arm: ["He's going after the arm.", "Another shot to that arm."],
    limb_leg: ["He kicks the leg out from under him.", "He's working on that knee."],
    limb_back: ["A club across the back.", "He's working over the lower back."],
    hold: ["He's got a hold locked in! Can he get to the ropes?", "He's cinching it in, in the middle of the ring!"],
    ropebreak: ["He made the ropes! The referee calls for the break.", "He gets a hand on the bottom rope!"],
    tap: "HE GAVE UP! He's tapping! It's over!",
    ten: "ALL TEN! Listen to this place!",
    refbump: ["THE REFEREE IS DOWN! He ran him right into the official!", "He wiped out the referee! Nobody is in charge of this match!"],
    getchair: ["Oh no. He's got a chair. He's got a CHAIR.", "He pulled a chair out from under the ring!"],
    chair: ["HE HIT HIM WITH THE CHAIR! Right across the back!", "A CHAIR SHOT! That is assault, Chet!"],
    chairmiss: "HE DUCKED! The chair came back off the ropes and hit HIM in the face!",
    refup: "The referee is stirring. He has no idea what just happened.",
    visual: "He's got him pinned, and there is NO REFEREE to count it!",
    robbery: "ONE, TWO, THREE. He STOLE it! The champion retains, and this crowd wants blood!",
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
    nosell: "You no-sold him. He will remember that.",
    letgo: "Good. Let him get his heat, then make them want your comeback.",
    count: "Seven! Get back in that ring.",
    warn: "He saw that. Cheat where the referee can't see it.",
    late: "Kick out LATE. The closer to three, the louder it gets."
  };
})();
