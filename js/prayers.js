/*
 * Decade4U: prayer texts and mysteries (English).
 *
 * All the words people read while praying live in this one file, so they can
 * be checked and translated without touching the page code.
 * Translators: copy this file (e.g. prayers.it.js) and translate the values,
 * not the keys.
 */
window.ROSARY_TEXT = {
  prayers: {
    sign: {
      title: "Sign of the Cross",
      text: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen."
    },
    creed: {
      title: "Apostles' Creed",
      text:
        "I believe in God, the Father almighty, Creator of heaven and earth, " +
        "and in Jesus Christ, his only Son, our Lord, " +
        "who was conceived by the Holy Spirit, born of the Virgin Mary, " +
        "suffered under Pontius Pilate, was crucified, died and was buried; " +
        "he descended into hell; on the third day he rose again from the dead; " +
        "he ascended into heaven, and is seated at the right hand of God the Father almighty; " +
        "from there he will come to judge the living and the dead.\n" +
        "I believe in the Holy Spirit, the holy catholic Church, the communion of saints, " +
        "the forgiveness of sins, the resurrection of the body, and life everlasting. Amen."
    },
    our: {
      title: "Our Father",
      text:
        "Our Father, who art in heaven, hallowed be thy name; " +
        "thy kingdom come, thy will be done on earth as it is in heaven. " +
        "Give us this day our daily bread, and forgive us our trespasses, " +
        "as we forgive those who trespass against us; " +
        "and lead us not into temptation, but deliver us from evil. Amen."
    },
    hail: {
      title: "Hail Mary",
      text:
        "Hail Mary, full of grace, the Lord is with thee. " +
        "Blessed art thou among women, and blessed is the fruit of thy womb, Jesus.\n" +
        "Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen."
    },
    glory: {
      title: "Glory Be",
      text:
        "Glory be to the Father, and to the Son, and to the Holy Spirit. " +
        "As it was in the beginning, is now, and ever shall be, world without end. Amen."
    },
    fatima: {
      title: "Fatima Prayer",
      text:
        "O my Jesus, forgive us our sins, save us from the fires of hell; " +
        "lead all souls to heaven, especially those in most need of thy mercy."
    },
    hhq: {
      title: "Hail, Holy Queen",
      text:
        "Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. " +
        "To thee do we cry, poor banished children of Eve; " +
        "to thee do we send up our sighs, mourning and weeping in this valley of tears. " +
        "Turn then, most gracious advocate, thine eyes of mercy toward us; " +
        "and after this our exile, show unto us the blessed fruit of thy womb, Jesus. " +
        "O clement, O loving, O sweet Virgin Mary.\n" +
        "V. Pray for us, O holy Mother of God.\n" +
        "R. That we may be made worthy of the promises of Christ."
    },
    closing: {
      title: "Closing Prayer",
      text:
        "Let us pray. O God, whose only begotten Son, by his life, death and resurrection, " +
        "has purchased for us the rewards of eternal life; grant, we beseech thee, " +
        "that while meditating on these mysteries of the most holy Rosary of the Blessed Virgin Mary, " +
        "we may imitate what they contain and obtain what they promise, " +
        "through the same Christ our Lord. Amen."
    }
  },

  openingNotes: ["For an increase of faith", "For an increase of hope", "For an increase of charity"],

  ordinals: ["First", "Second", "Third", "Fourth", "Fifth"],

  // Day of week: 0 = Sunday ... 6 = Saturday
  mysteries: {
    joyful: {
      name: "Joyful",
      days: [1, 6],
      list: [
        "The Annunciation",
        "The Visitation",
        "The Nativity of Our Lord",
        "The Presentation in the Temple",
        "The Finding of Jesus in the Temple"
      ]
    },
    sorrowful: {
      name: "Sorrowful",
      days: [2, 5],
      list: [
        "The Agony in the Garden",
        "The Scourging at the Pillar",
        "The Crowning with Thorns",
        "The Carrying of the Cross",
        "The Crucifixion and Death of Our Lord"
      ]
    },
    glorious: {
      name: "Glorious",
      days: [0, 3],
      list: [
        "The Resurrection",
        "The Ascension",
        "The Descent of the Holy Spirit",
        "The Assumption of Mary",
        "The Coronation of Mary as Queen of Heaven and Earth"
      ]
    },
    luminous: {
      name: "Luminous",
      days: [4],
      list: [
        "The Baptism of the Lord",
        "The Wedding at Cana",
        "The Proclamation of the Kingdom",
        "The Transfiguration",
        "The Institution of the Eucharist"
      ]
    }
  },

  ui: {
    opening: "Opening prayers",
    closing: "Closing prayers",
    decade: "Decade {n} of {total}",
    mysteryTitle: "The {ordinal} {set} Mystery",
    mysteryHint: "Take a moment to picture this mystery, then press Next.",
    mysteriesToday: "{set} Mysteries",
    next: "Next",
    back: "Back",
    finish: "Amen",
    resumed: "Continuing where you left off.",
    restartConfirm: "Stop and go back to the start? Your progress will be lost.",
    anonymous: "Someone",
    statOne: "person you have prayed for",
    statMany: "people you have prayed for",
    hidePrayersBtn: "Hide prayers",
    hintBeads: "Tap the rosary or swipe left for the next bead · swipe right to go back",
    hintOwn: "Swipe left for the next decade · swipe right to go back",
    showPrayersBtn: "Show prayers",
    mysteryShort: "{ordinal} {set} Mystery",
    decadeList: "Our Father · Hail Mary × 10 · Glory Be · Fatima Prayer",
    decadeFor: "Decade {n} · for {name}",
    prayingFor: "You are praying this decade for {name}",
    forShort: "For {name}",
    fullNote: "Full rosary: opening prayers, 5 decades, closing prayers.",
    shortNote: "Short version: the Sign of the Cross, your decades, then the Sign of the Cross.",
    startOne: "Start praying 1 decade",
    startMany: "Start praying {n} decades",
    doneOne: "You prayed 1 decade for someone today.",
    doneMany: "You prayed {n} decades, each for a different person.",
    defaultThanks: "Thank you for praying for me. May God bless you.",
    changeModeConfirm: "Change how you pray? This starts the rosary again from the beginning.",
    modeBeadsShort: "Bead by bead",
    modeOwnShort: "With my own rosary",
    showPrayers: "Show the prayers",
    ownHint: "Pray these on your own rosary, then press Next.",
    ownDecadeHint: "Pray this decade on your own rosary, then press Next."
  }
};
