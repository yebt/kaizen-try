#!/usr/bin/env python3
"""Curated habit icons for the icon picker: Lucide names, English + Spanish search words, categories."""

# (id, label, Spanish label, [(LucideName, "search words in English and Spanish")])
CATS = [
 ("health", "Health", "Salud", [
  ("Droplet","water drink hydrate agua beber hidratar"),("GlassWater","water glass drink agua vaso"),("Droplets","water drops skincare gotas"),
  ("Pill","medicine vitamins pastilla medicina vitaminas"),("Tablets","medicine pills pastillas"),("Syringe","injection insulin vaccine inyeccion"),
  ("Stethoscope","doctor checkup medico chequeo"),("HeartPulse","heart rate cardio pulso corazon"),("Heart","health love salud amor corazon"),
  ("Thermometer","temperature fever temperatura fiebre"),("Bandage","first aid curita"),("Toothbrush","brush teeth floss dientes cepillarse lavarse"),("Eye","eyes vision ojos vista"),("Ear","hearing oido"),
  ("Bed","sleep rest bed dormir descansar cama"),("BedDouble","sleep bed dormir cama"),("Moon","sleep night dormir noche"),
  ("AlarmClock","wake up alarm despertar alarma"),("Sunrise","early rise morning madrugar manana"),("Sunset","evening wind down tarde"),
  ("Scale","weight weigh peso pesar"),("Weight","weight lifting peso pesas"),("ShowerHead","shower bath ducha banarse"),("Bath","bath relax bano tina"),
  ("HandHeart","self care autocuidado"),("Sparkles","skincare glow cuidado piel brillo"),("Smile","mood happy animo feliz sonreir"),
  ("Brain","mind mental mente cerebro"),("Activity","activity health actividad salud"),
 ]),
 ("fitness", "Fitness", "Ejercicio", [
  ("Dumbbell","gym weights workout gimnasio pesas entrenar"),("BicepsFlexed","strength muscles fuerza musculos"),
  ("Footprints","walk steps caminar pasos"),("PersonStanding","posture stretch postura estirar"),("Bike","bike cycling bicicleta ciclismo"),
  ("Waves","swim pool nadar piscina"),("Mountain","hike climb caminata escalar montana"),("MountainSnow","ski mountain esquiar"),
  ("Timer","timer interval plank cronometro"),("Trophy","goal win meta ganar trofeo"),("Medal","medal achievement medalla logro"),
  ("Volleyball","volleyball ball sport voleibol deporte"),("Goal","soccer football goal futbol porteria"),("Target","target aim objetivo"),
  ("Flame","burn calories cardio quemar calorias fuego"),("Zap","energy hiit energia"),("Gauge","pace speed ritmo velocidad"),
  ("Accessibility","stretch mobility estiramiento movilidad"),("Swords","martial arts fencing artes marciales"),("Tent","camping acampar"),
 ]),
 ("food", "Food & drink", "Comida", [
  ("Apple","fruit healthy fruta saludable manzana"),("Carrot","vegetables veggies verduras zanahoria"),("Salad","salad greens ensalada"),
  ("Soup","soup cook sopa cocinar"),("Utensils","meal eat comida comer"),("UtensilsCrossed","fasting meal ayuno comida"),
  ("Coffee","coffee caffeine cafe cafeina"),("CupSoda","soda soft drink refresco gaseosa"),("Milk","milk dairy leche lacteos"),
  ("Egg","protein breakfast huevo proteina desayuno"),("Fish","fish omega pescado"),("Beef","meat protein carne"),("Wheat","bread carbs grains pan cereales"),
  ("Cherry","fruit fruta cereza"),("Citrus","vitamin c citrus citricos naranja"),("Banana","fruit platano banana"),("Grape","fruit uva"),
  ("Sandwich","lunch sandwich almuerzo"),("Pizza","pizza junk food comida chatarra"),("Hamburger","burger fast food hamburguesa comida rapida"),
  ("Cookie","cookie snack galleta"),("Candy","sugar sweets azucar dulces"),("CakeSlice","cake dessert pastel postre"),
  ("IceCreamCone","ice cream dessert helado postre"),("Croissant","pastry bakery pan dulce"),("Popcorn","snack palomitas"),
  ("CookingPot","cook cocinar olla"),("ChefHat","cook chef cocinar"),("Vegan","vegan plant based vegano"),("Leaf","vegetarian natural vegetariano hoja"),
 ]),
 ("mind", "Mind", "Mente", [
  ("Sun","meditate morning meditar manana sol"),("Wind","breathe breathing respirar respiracion"),("Flower2","calm gratitude calma gratitud flor"),
  ("Feather","journal light diario ligero"),("CloudSun","mood weather animo"),("Infinity","mindful presence presente"),("Lightbulb","ideas insight idea"),
  ("NotebookPen","journal write diario escribir"),("HeartHandshake","kindness gratitude amabilidad gratitud"),("Sparkle","affirmation afirmacion"),
  ("Hourglass","patience time paciencia tiempo"),("Leaf","nature calm naturaleza calma"),("Brain","mind focus mente concentracion"),
 ]),
 ("learn", "Learning", "Aprender", [
  ("BookOpen","read reading leer lectura libro"),("Book","book study read libro estudiar leer"),("BookMarked","reading list read lectura leer"),("Library","library books read biblioteca libros leer"),
  ("GraduationCap","study course class estudiar curso clase"),("Languages","language learn languages idioma aprender idiomas"),
  ("PenLine","write writing escribir"),("Pencil","draw sketch dibujar lapiz"),("FileText","notes essay notas ensayo"),("Newspaper","news noticias periodico"),
  ("Microscope","science ciencia"),("Calculator","math matematicas calculadora"),("Globe","geography world mundo"),("Code","code programming programar codigo"),
  ("Laptop","computer online course computadora"),("Headphones","podcast audiobook audiolibro"),("Mic","speak practice hablar practicar"),
 ]),
 ("work", "Work & focus", "Trabajo", [
  ("Briefcase","work job trabajo"),("Monitor","computer desk escritorio"),("Mail","email inbox correo"),("Inbox","inbox zero bandeja"),
  ("Calendar","plan schedule planificar agenda"),("CalendarCheck","plan day planear dia"),("ListChecks","to do tasks tareas pendientes"),
  ("ClipboardCheck","review checklist revisar"),("SquareCheckBig","done check hecho"),("Clock","time hours tiempo horas"),
  ("Focus","focus deep work concentracion"),("Rocket","project launch proyecto"),("Presentation","presentation presentacion"),
  ("Folder","files organize archivos organizar"),("Kanban","plan board tablero"),("Target","goals metas"),
 ]),
 ("home", "Home", "Hogar", [
  ("House","home chores casa tareas"),("Sofa","rest living room sofa descanso"),("Lamp","evening lamp lampara"),("WashingMachine","laundry lavar ropa"),
  ("Shirt","clothes laundry ropa"),("Trash2","trash declutter basura ordenar"),("Recycle","recycle reciclar"),("SprayCan","clean limpiar"),("BrushCleaning","sweep clean barrer limpiar"),("Broom","sweep mop barrer trapear escoba"),
  ("Brush","clean brush limpiar cepillo"),("Key","keys llaves"),("Wrench","fix repair arreglar reparar"),("Hammer","diy build construir"),
  ("Sprout","plants water plants plantas regar"),("Flower","garden jardin flor"),("Dog","dog walk perro pasear"),("Cat","cat gato"),
  ("PawPrint","pet mascota"),("Baby","baby kids bebe ninos"),("Car","car drive carro conducir"),("Bed","make bed tender cama"),
 ]),
 ("social", "Social", "Social", [
  ("Users","friends family amigos familia"),("UserRound","person persona"),("Phone","call llamar telefono"),("MessageCircle","message text mensaje"),
  ("Video","video call videollamada"),("Gift","gift kindness regalo"),("Handshake","network meet conocer"),("PartyPopper","celebrate celebrar fiesta"),
  ("HeartHandshake","volunteer help voluntario ayudar"),("Church","faith pray fe orar iglesia"),("HandHelping","help others ayudar"),
 ]),
 ("money", "Money", "Dinero", [
  ("Wallet","budget spend presupuesto gastar cartera"),("PiggyBank","save money ahorrar alcancia"),("Banknote","cash money efectivo dinero"),
  ("Coins","coins save monedas ahorrar"),("CreditCard","card spending tarjeta gastos"),("Receipt","expenses gastos recibo"),
  ("TrendingUp","invest growth invertir crecer"),("ChartLine","track chart grafica seguimiento"),("Landmark","bank banco"),
  ("ShoppingCart","shopping groceries compras super"),("HandCoins","donate tithe donar"),
 ]),
 ("hobby", "Hobbies", "Pasatiempos", [
  ("Music","music practice musica practicar"),("Guitar","guitar guitarra"),("Piano","piano"),("Drum","drums bateria tambor"),
  ("Palette","paint art pintar arte"),("Camera","photo photography foto fotografia"),("Image","photo imagen"),("Film","movie film pelicula"),
  ("Clapperboard","video edit video"),("Scissors","craft manualidades tijeras"),("Gamepad2","games gaming videojuegos jugar"),
  ("Puzzle","puzzle rompecabezas"),("Dices","board games juegos de mesa dados"),("Shapes","design diseno"),("Telescope","stars astronomy astronomia"),
  ("Fish","fishing pescar"),("Bird","birdwatching aves"),
 ]),
 ("nature", "Outdoors", "Aire libre", [
  ("TreePine","forest nature bosque naturaleza"),("Trees","park walk parque"),("Compass","explore explorar brujula"),("Map","travel trip viajar mapa"),
  ("Tent","camp acampar"),("Mountain","hike senderismo"),("Waves","beach sea playa mar"),("Snowflake","cold shower frio ducha fria"),
  ("CloudRain","rain lluvia"),("Sun","sunlight outside sol afuera"),("Sprout","grow crecer"),("Footprints","walk caminar"),
 ]),
 ("quit", "Quit & limit", "Dejar", [
  ("Cigarette","smoke smoking fumar cigarro"),("CigaretteOff","quit smoking no fumar dejar"),("Wine","alcohol wine vino"),("WineOff","no alcohol sin alcohol"),
  ("Beer","beer alcohol cerveza"),("BeerOff","no beer sin cerveza"),("Smartphone","phone screen time celular pantalla"),("PhoneOff","phone free sin celular"),
  ("Tv","tv series television"),("MonitorOff","screens off sin pantallas"),("Gamepad2","gaming videojuegos"),("Candy","sugar azucar dulces"),
  ("CandyOff","no sugar sin azucar"),("Cookie","snacks botanas"),("Hamburger","fast food comida rapida"),("Pizza","junk food comida chatarra"),
  ("Coffee","caffeine cafeina"),("Ban","stop avoid evitar prohibido"),("Dices","gambling apuestas"),("BellOff","notifications notificaciones"),
  ("ShoppingBag","impulse buying compras impulsivas"),("Hand","nail biting morderse unas mano"),("MessageCircleOff","gossip complain quejarse chisme"),
  ("Clock","procrastination procrastinar"),("Bed","oversleeping dormir de mas"),
 ]),
]

LABELS = {
 "BookOpen":"Open book","BedDouble":"Double bed","GlassWater":"Glass of water","HeartPulse":"Heartbeat","ShowerHead":"Shower",
 "HandHeart":"Self-care","CigaretteOff":"No smoking","WineOff":"No alcohol","BeerOff":"No beer","CandyOff":"No sugar",
 "PhoneOff":"Phone off","MonitorOff":"No screens","BellOff":"No notifications","MessageCircleOff":"No complaining",
 "SquareCheckBig":"Done","Gamepad2":"Gaming","Trash2":"Trash","Flower2":"Blossom","UserRound":"Person","PersonStanding":"Posture",
 "BicepsFlexed":"Strength","UtensilsCrossed":"Fasting","CupSoda":"Soda","IceCreamCone":"Ice cream","CakeSlice":"Cake",
 "PawPrint":"Pet","PiggyBank":"Savings","HandCoins":"Donate","ChartLine":"Chart","TrendingUp":"Invest","NotebookPen":"Journal",
 "PenLine":"Write","BookMarked":"Reading list","GraduationCap":"Study","Footprints":"Walk","Waves":"Swim","Accessibility":"Stretch",
 "ClipboardCheck":"Review","ListChecks":"To-do","CalendarCheck":"Plan day","HeartHandshake":"Kindness","HandHelping":"Help others",
 "SprayCan":"Clean","BrushCleaning":"Sweep","Droplets":"Drops","Droplet":"Water","AlarmClock":"Alarm","MountainSnow":"Ski",
 "WashingMachine":"Laundry","CookingPot":"Cook","ChefHat":"Chef","CloudSun":"Mood","CloudRain":"Rain","TreePine":"Forest",
 "Trees":"Park","Dices":"Dice","Clapperboard":"Edit video","Video":"Video call","Smartphone":"Phone","Phone":"Call","MessageCircle":"Message",
 "Tv":"TV","Goal":"Football","Volleyball":"Volleyball","Gauge":"Pace","Zap":"Energy","Flame":"Burn","Weight":"Weights",
 "Scale":"Weigh-in","Sparkles":"Skincare","Sparkle":"Affirmation","Infinity":"Mindfulness","Wind":"Breathe","Sun":"Sun",
 "House":"Home","Sofa":"Relax","Landmark":"Bank","Banknote":"Cash","Hamburger":"Burger","Vegan":"Plant-based","Beef":"Meat",
 "Wheat":"Grains","Citrus":"Citrus","Swords":"Martial arts","Kanban":"Board","Focus":"Focus","Hand":"Nail biting",
 "Ban":"Avoid","Bird":"Birdwatching","Telescope":"Stargazing","Activity":"Activity","Brain":"Mind","Bike":"Cycling",
}


# ---------------------------------------------------------------------------
import os, re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'components', 'icons', 'catalog.ts')

def kebab(n):
    return re.sub(r'(?<=[a-z])(?=[A-Z0-9])|(?<=[0-9])(?=[A-Z])', '-', n).lower()

def label(n):
    if n in LABELS:
        return LABELS[n]
    s = re.sub(r'(?<=[a-z])(?=[A-Z0-9])', ' ', n).replace('2', '').strip()
    return s[0] + s[1:].lower()

def main():
    icons, order = {}, []
    for cid, lab, es, items in CATS:
        for n, tags in items:
            k = kebab(n)
            if k not in icons:
                icons[k] = {'n': n, 'tags': set()}
                order.append(k)
            icons[k]['tags'].update(tags.split())
    labels = [label(icons[k]['n']) for k in order]
    dups = {l for l in labels if labels.count(l) > 1}
    assert not dups, f'duplicate labels: {dups}'
    out = [
        '// Generated by scripts/gen-icon-catalog.py — edit that file, then run',
        '// `python3 scripts/gen-icon-catalog.py`. Icons are Lucide (ISC license),',
        '// imported by name so only these end up in the bundle.',
        'import {',
    ]
    out += [f'  {n},' for n in sorted({icons[k]["n"] for k in icons})]
    out += ['  type LucideIcon,', "} from 'lucide-react'", '']
    out += ['export interface IconDef {', '  key: string', '  Icon: LucideIcon', '  label: string',
            '  /** Search words, English and Spanish. */', '  tags: string', '}', '']
    out += ['export interface IconCategory {', '  id: string', '  label: string',
            '  /** Spanish name, used for search. */', '  es: string', '  keys: string[]', '}', '']
    out.append('export const ICONS: Record<string, IconDef> = {')
    for k in order:
        i = icons[k]
        out.append(f"  '{k}': {{ key: '{k}', Icon: {i['n']}, label: '{label(i['n'])}', tags: '{' '.join(sorted(i['tags']))}' }},")
    out += ['}', '', 'export const ICON_CATEGORIES: IconCategory[] = [']
    for cid, lab, es, items in CATS:
        keys = list(dict.fromkeys(kebab(n) for n, _ in items))
        out.append(f"  {{ id: '{cid}', label: '{lab}', es: '{es}', keys: [{', '.join(repr(k) for k in keys)}] }},")
    out.append(']')
    with open(OUT, 'w') as f:
        f.write('\n'.join(out) + '\n')
    print(f'{len(icons)} icons in {len(CATS)} categories -> {os.path.relpath(OUT)}')

if __name__ == '__main__':
    main()
