# Scraping de datos de personaje wow armory.warmane.com:

api para traer datos de personaje wow:

```
https://armory.warmane.com/api/character/[name]/icecrown/summary
```

Ejemplo de respuesta:

```json
{
  "name": "Terrym",
  "realm": "Icecrown",
  "online": false,
  "level": "80",
  "faction": "Alliance",
  "gender": "Male",
  "race": "Night Elf",
  "racemask": 8,
  "class": "Druid",
  "classmask": 1024,
  "honorablekills": "405",
  "guild": "Taka",
  "achievementpoints": "2675",
  "equipment": [
    {
      "name": "Sanctified Lasherweave Headguard",
      "item": "51143",
      "transmog": ""
    },
    {
      "name": "Bile-Encrusted Medallion",
      "item": "50682",
      "transmog": ""
    },
    {
      "name": "Sanctified Lasherweave Shoulderpads",
      "item": "51140",
      "transmog": ""
    },
    {
      "name": "Royal Crimson Cloak",
      "item": "50718",
      "transmog": ""
    },
    {
      "name": "Ikfirus's Sack of Wonder",
      "item": "50656",
      "transmog": ""
    },
    {
      "name": "Red Linen Shirt",
      "item": "2575",
      "transmog": ""
    },
    {
      "name": "Tabard of Summer Flames",
      "item": "35280",
      "transmog": ""
    },
    {
      "name": "Wrathful Gladiator's Armwraps of Triumph",
      "item": "51370",
      "transmog": ""
    },
    {
      "name": "Sanctified Lasherweave Handgrips",
      "item": "51144",
      "transmog": ""
    },
    {
      "name": "Soulthief's Braided Belt",
      "item": "51925",
      "transmog": ""
    },
    {
      "name": "Sanctified Lasherweave Legguards",
      "item": "51142",
      "transmog": ""
    },
    {
      "name": "Footpads of Impending Death",
      "item": "49895",
      "transmog": ""
    },
    {
      "name": "Harbinger's Bone Band",
      "item": "50447",
      "transmog": ""
    },
    {
      "name": "Abomination's Bloody Ring",
      "item": "51913",
      "transmog": ""
    },
    {
      "name": "Whispering Fanged Skull",
      "item": "50342",
      "transmog": ""
    },
    {
      "name": "Banner of Victory",
      "item": "47214",
      "transmog": ""
    },
    {
      "name": "Bloodfall",
      "item": "50727",
      "transmog": ""
    },
    {
      "name": "Idol of the Crying Moon",
      "item": "50456",
      "transmog": ""
    }
  ],
  "talents": [
    {
      "tree": "Feral Combat",
      "points": [0, 60, 11]
    },
    {
      "tree": "Feral Combat",
      "points": [0, 55, 16]
    }
  ],
  "professions": [
    {
      "name": "Tailoring",
      "skill": "438"
    },
    {
      "name": "Enchanting",
      "skill": "409"
    }
  ],
  "pvpteams": []
}
```

---

# fetch para obtener tipo de item:

```
https://wotlk.cavernoftime.com/item=${itemId}&power=true
```

Ejemplo de respuesta:

```js
$utilGrp.regItem('50682', 0, {name_enus: 'Bile-Encrusted Medallion',quality: 4,icon: 'item_icecrownnecklaceb',tooltip_enus: '
Bile-Encrusted Medallion<\/b>
Heroic<\/span>
Binds when picked up
Neck<\/td>	<\/td><\/tr><\/table>756 Armor
+102 Strength
+141 Stamina
Red Socket<\/span>
Socket Bonus: +6 Stamina<\/span>
Requires Level 80
Item Level 277
<\/td><\/tr><\/table>
Equip: Increases defense rating by 54 (10.98 @ L80<\/a>)<\/small>.<\/span>
Equip: Increases your dodge rating by 46 (1.17% @ L80<\/a>)<\/small>.<\/span>
Sell Price: 7<\/span> 56<\/span> 23<\/span><\/td><\/tr><\/table>'}, 2)
```

con la respuesta anterior podemos obtener el tipo de item:

```js
const itemType = html.includes('Head') ? 'Head' : 'Shoulder'
```

---

# Respuesta de ejemplo esperada en el endpoint "/api/:character":

```json
{
  "left": [
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51143",
      "rel": "item=51143&ench=3818&gems=3637:3532:0&transmog=23308",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_helmet_148.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50682",
      "rel": "item=50682&gems=3532:0:0",
      "src": "http://cdn.warmane.com/wotlk/icons/large/item_icecrownnecklaceb.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51140",
      "rel": "item=51140&ench=3852&gems=3532:0:0&transmog=23309",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_shoulder_111.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50718",
      "rel": "item=50718&ench=3294&gems=3532:0:0",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_misc_cape_18.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50656",
      "rel": "item=50656&ench=3297&gems=3537:3532:3532&transmog=23294",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_chest_leather_22.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=2575",
      "rel": "item=2575",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_shirt_red_01.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=35280",
      "rel": "item=35280",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_misc_tabardsummer01.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51370",
      "rel": "item=51370&ench=1600",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_bracer_53.jpg",
      "width": "50",
      "height": "50"
    }
  ],
  "right": [
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51144",
      "rel": "item=51144&ench=3253&gems=3537:0:0&transmog=23280",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_gauntlets_83.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51925",
      "rel": "item=51925&gems=3532:3532:3532",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_belt_61.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51142",
      "rel": "item=51142&ench=3822&gems=3532:3532:0&transmog=23295",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_pants_leather_35.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=49895",
      "rel": "item=49895&ench=1075&gems=3537:3532:0&transmog=23281",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_boots_leather_07.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50447",
      "rel": "item=50447&ench=3791&gems=3879:0:0",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_jewelry_ring_84.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=51913",
      "rel": "item=51913&ench=3791&gems=3532:0:0",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_jewelry_ring_85.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50342",
      "rel": "item=50342",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_misc_bone_skull_02.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=47214",
      "rel": "item=47214",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_bannerpvp_03.jpg",
      "width": "50",
      "height": "50"
    }
  ],
  "bottom": [
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50727",
      "rel": "item=50727&ench=2673&gems=3532:3532:3532",
      "src": "http://cdn.warmane.com/wotlk/icons/large/inv_weapon_staff_109.jpg",
      "width": "50",
      "height": "50"
    },
    {
      "href": "#self"
    },
    {
      "target": "_blank",
      "href": "http://wotlk.cavernoftime.com/item=50456",
      "rel": "item=50456",
      "src": "http://cdn.warmane.com/wotlk/icons/large/spell_nature_natureguardian.jpg",
      "width": "50",
      "height": "50"
    }
  ],
  "scrapedAt": "2026-05-03T13:58:44.253Z"
}
```

La idea principal es obtner como respuesta un json con las propiedades "left", "right", "bottom" y "scrapedAt". En cada pripiedad debe estar un arreglo de objetos con las propiedades "target", "href", "rel", "src", "width" y "height". En total debe ser 8 objetos dentro de "left", 8 objetos dentro de "right" y 3 objetos dentro de "bottom". El objeto "scrapedAt" debe tener la propiedad "scrapedAt".
El fetch realizado a "armory.warmane.com" no te dice si pertenece a Left, Right o Bottom. por eso se debe realizar un fetch por cada item para obtener su tipo. los tipos de items left son:
- Head
- Neck
- Shoulder
- Back
- Chest
- Shirt
- Tabard
- Wrist

Los tipos de items right son:
- Hands
- Waist
- Legs
- Feet
- Finger
- Finger
- Trinket
- Trinket

Los tipos de item Bottom son:
- ["Swords", "Axes", "Maces", "Daggers", "Fist Weapons","Two-Handed Swords", "Two-Handed Axes", "Two-Handed Maces", "Polearms", "Staves"]
- ["Warglaives", "Shields", "Off-hand"]
- ["Bows", "Crossbows", "Guns", "Wands"]

