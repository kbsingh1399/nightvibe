"""
NightVibe India — Seed Data
===========================

Idempotently seeds the relational DB with the same venues, events and promoters
that the frontend prototype renders, so the API and the UI stay in mirror parity.

Safe to run on every boot: it skips entities whose primary keys already exist.
"""

import datetime
import uuid

from sqlalchemy.orm import Session

from backend.models import (
    Venue,
    Event,
    Promoter,
    PromoterBid,
    TableInventory,
)

# Promoters keyed by id (mirrors src/data/initialData.js INITIAL_PROMOTERS)
_PROMOTERS = [
    {
        "id": "pr_rahul", "name": "Rahul Mehta", "handle": "@MumbaiVIPPR",
        "niche": "VIP Nightlife", "city": "mumbai", "tier": "Elite Gold",
        "rating": 4.9, "show_up_rate": 91, "conversions": 847,
        "upi_id": "rahul.pr@okhdfcbank", "phone": "+91 98202 99111",
        "unlocked_wallet_inr": 24500, "verified": True,
    },
    {
        "id": "pr_ananya", "name": "Ananya Verma", "handle": "@BandraElitePR",
        "niche": "Fashion & Celebrity", "city": "mumbai", "tier": "Elite Gold",
        "rating": 4.8, "show_up_rate": 88, "conversions": 620,
        "upi_id": "ananya.nightlife@paytm", "phone": "+91 98111 22334",
        "unlocked_wallet_inr": 18200, "verified": True,
    },
    {
        "id": "pr_sam", "name": "DJ Sam & Crew", "handle": "@GoaUndergroundPR",
        "niche": "Underground Techno", "city": "goa", "tier": "Pro Platinum",
        "rating": 4.9, "show_up_rate": 94, "conversions": 1120,
        "upi_id": "sam.goa@icici", "phone": "+91 97650 11223",
        "unlocked_wallet_inr": 50900, "verified": True,
    },
    {
        "id": "pr_kabir", "name": "Kabir Oberoi", "handle": "@DelhiNightLifeIcon",
        "niche": "Commercial & Bollywood", "city": "delhi", "tier": "Pro Silver",
        "rating": 4.7, "show_up_rate": 86, "conversions": 430,
        "upi_id": "kabir.nightlife@ybl", "phone": "+91 99112 33445",
        "unlocked_wallet_inr": 9300, "verified": True,
    },
]

_VENUES = [
    {
        "id": "venue_trilogy", "name": "Trilogy Club & Lounge", "area": "Lower Parel",
        "city": "mumbai", "capacity": 650, "current_occupancy": 347,
        "gstin": "27AABCT1234F1Z9", "fssai": "11521000000000",
        "owner_phone": "+91 98201 54321",
    },
    {
        "id": "venue_koko", "name": "Kōkō Luxury Bar & Club", "area": "Bandra West",
        "city": "mumbai", "capacity": 400, "current_occupancy": 280,
        "gstin": "27AAACK5678P1Z3", "fssai": "11521000000001",
        "owner_phone": "+91 98199 87654",
    },
    {
        "id": "venue_bastian", "name": "Bastian At The Top", "area": "Lower Parel",
        "city": "mumbai", "capacity": 500, "current_occupancy": 390,
        "gstin": "27AAACB9012K1Z7", "fssai": "11521000000002",
        "owner_phone": "+91 98210 11223",
    },
    {
        "id": "venue_raeeth", "name": "Raeeth Beach Sanctuary", "area": "Vagator Cliff",
        "city": "goa", "capacity": 800, "current_occupancy": 512,
        "gstin": "30AABCR1234G1Z5", "fssai": "11521000000003",
        "owner_phone": "+91 97654 32109",
    },
]

# Events keyed by id (mirrors INITIAL_EVENTS); table_categories reflect the
# dynamic surge-tier model described in CYCLE 4.
_EVENTS = [
    {
        "id": "evt_trilogy_sunburn", "venue_id": "venue_trilogy",
        "title": "Sunburn Arena ft. KSHMR & Friends", "genre": "Commercial EDM",
        "date_label": "Saturday, Tonight", "base_price": 2000, "floor_price": 1600,
        "commission_cap": 300, "sold_pax": 140, "target_pax": 300,
        "image_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
        "doors_open_at": datetime.datetime.utcnow() + datetime.timedelta(hours=6),
        "approved_perks": [
            {"id": "perk_shooter", "name": "1 Free Shooter / Cocktail Token", "value": 350},
            {"id": "perk_fasttrack", "name": "Fast-Track Queue Bypass (<5m wait)", "value": 400},
            {"id": "perk_female_free", "name": "Female Guestlist Free (before 11 PM)", "value": 500},
            {"id": "perk_table_discount", "name": "10% Off Bottle Service Menu", "value": 800},
            {"id": "perk_host", "name": "Dedicated Table Host Greeting", "value": 300},
        ],
        "table_categories": [
            {
                "id": "cat_vip_6", "name": "VIP Lounge 6-Pax", "pax_per_table": 6,
                "total_tables": 8, "booked_tables": 2,
                "tiers": [
                    {"min_table": 1, "max_table": 2, "price": 10000, "min_spend": 8000, "name": "Early Bird"},
                    {"min_table": 3, "max_table": 5, "price": 50000, "min_spend": 40000, "name": "Peak Surge"},
                    {"min_table": 6, "max_table": 8, "price": 100000, "min_spend": 80000, "name": "Final Premium"},
                ],
            },
            {
                "id": "cat_vvip_10", "name": "VVIP Stage 10-Pax", "pax_per_table": 10,
                "total_tables": 4, "booked_tables": 1,
                "tiers": [
                    {"min_table": 1, "max_table": 2, "price": 75000, "min_spend": 60000, "name": "Stage Prime"},
                    {"min_table": 3, "max_table": 4, "price": 150000, "min_spend": 120000, "name": "Stage Premium"},
                ],
            },
        ],
        "bids": [
            {"id": "bid_1", "pr_id": "pr_rahul", "price": 1650,
             "perks": ["perk_fasttrack", "perk_shooter"], "notes": "Includes 1 Premium Shooter + Express entry."},
            {"id": "bid_2", "pr_id": "pr_ananya", "price": 1750,
             "perks": ["perk_female_free", "perk_table_discount"], "notes": "Couple deal + 1:1 free female guestlist."},
        ],
    },
    {
        "id": "evt_koko_friday", "venue_id": "venue_koko",
        "title": "Neon Tokyo: Melodic House & Nu-Disco", "genre": "Techno & Underground",
        "date_label": "Friday, Tomorrow", "base_price": 1800, "floor_price": 1500,
        "commission_cap": 250, "sold_pax": 90, "target_pax": 220,
        "image_url": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
        "doors_open_at": datetime.datetime.utcnow() + datetime.timedelta(hours=30),
        "approved_perks": [
            {"id": "perk_shooter", "name": "1 Complimentary Craft Cocktail", "value": 450},
            {"id": "perk_fasttrack", "name": "VIP Host Queue Bypass", "value": 400},
            {"id": "perk_host", "name": "Personal Table Host", "value": 300},
        ],
        "table_categories": [
            {
                "id": "cat_cocktail_4", "name": "Cocktail Table 4-Pax", "pax_per_table": 4,
                "total_tables": 6, "booked_tables": 0,
                "tiers": [
                    {"min_table": 1, "max_table": 2, "price": 8000, "min_spend": 6000, "name": "Standard"},
                    {"min_table": 3, "max_table": 6, "price": 20000, "min_spend": 15000, "name": "Premium"},
                ],
            },
        ],
        "bids": [
            {"id": "bid_3", "pr_id": "pr_ananya", "price": 1550,
             "perks": ["perk_shooter", "perk_fasttrack"], "notes": "Priority guestlist + bespoke Saké cocktail."},
            {"id": "bid_4", "pr_id": "pr_rahul", "price": 1600,
             "perks": ["perk_fasttrack"], "notes": "Instant entry stamp + bar lounge access."},
        ],
    },
]


def seed(db: Session) -> None:
    """Idempotently seed venues, promoters, events and their bids."""
    for p in _PROMOTERS:
        if db.get(Promoter, p["id"]):
            continue
        db.add(Promoter(**p))
    db.flush()

    for v in _VENUES:
        if db.get(Venue, v["id"]):
            continue
        db.add(Venue(**v, verified=True))
    db.flush()

    for orig in _EVENTS:
        e = dict(orig)  # copy — never mutate the module-level source data
        bids = e.pop("bids", [])
        if db.get(Event, e["id"]):
            # Backfill inventory if missing (idempotent across schema upgrades)
            for cat in (e.get("table_categories") or []):
                if not db.get(TableInventory, (e["id"], cat["id"])):
                    db.add(TableInventory(
                        event_id=e["id"], category_id=cat["id"],
                        category_name=cat.get("name", "VIP Table"),
                        booked_tables=cat.get("booked_tables", 0),
                        total_tables=cat.get("total_tables", 0),
                    ))
            continue
        ev = Event(**e)
        db.add(ev)
        db.flush()
        for cat in (e.get("table_categories") or []):
            db.add(TableInventory(
                event_id=e["id"], category_id=cat["id"],
                category_name=cat.get("name", "VIP Table"),
                booked_tables=cat.get("booked_tables", 0),
                total_tables=cat.get("total_tables", 0),
            ))
        for b in bids:
            db.add(PromoterBid(
                id=b["id"], event_id=e["id"], promoter_id=b["pr_id"],
                price=b["price"], perks=b["perks"], notes=b["notes"],
            ))

    db.commit()
