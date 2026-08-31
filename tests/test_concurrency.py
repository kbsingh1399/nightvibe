"""
CYCLE 4 & 5 — Chaos / load safety: concurrent capacity reservation and VIP
table allocation must never oversell floor quota or table inventory.
"""

from concurrent.futures import ThreadPoolExecutor

from backend import db as db_infra
from backend.models import Event
from backend.main import _reserve_floor_capacity, _acquire_table_allocation
from backend.seed import seed


def test_concurrent_floor_capacity_never_oversells():
    """Many threads reserve pax concurrently; total reserved must cap at target."""
    s = db_infra.SessionLocal()
    try:
        seed(s)
        ev = s.query(Event).filter(Event.id == "evt_trilogy_sunburn").one()
        initial = ev.sold_pax
        capacity = ev.target_pax
        available = capacity - initial
    finally:
        s.close()

    def worker(_i):
        db = db_infra.SessionLocal()
        try:
            ok = _reserve_floor_capacity(db, "evt_trilogy_sunburn", 1)
            db.commit()
            return ok
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=12) as ex:
        # Fire off slightly more attempts than remaining capacity.
        results = list(ex.map(worker, range(available + 5)))
    successes = sum(1 for r in results if r)

    # We cannot reserve more than `available` pax — zero oversell.
    assert successes <= available
    s = db_infra.SessionLocal()
    try:
        ev = s.query(Event).filter(Event.id == "evt_trilogy_sunburn").one()
        assert ev.sold_pax <= ev.target_pax
    finally:
        s.close()


def test_concurrent_vip_table_never_oversells():
    """Concurrent VIP table allocations must never exceed total_tables."""
    db = db_infra.SessionLocal()
    try:
        seed(db)
        ev = db.query(Event).filter(Event.id == "evt_trilogy_sunburn").one()
        cat_id = "cat_vip_6"
        cat = next(c for c in (ev.table_categories or []) if c["id"] == cat_id)
        total = cat["total_tables"]
        booked = cat["booked_tables"]
        remaining = total - booked
    finally:
        db.close()

    allocated = 0
    lock = __import__("threading").Lock()

    def worker(_i):
        nonlocal_vars = {}
        db2 = db_infra.SessionLocal()
        try:
            ev2 = db2.query(Event).filter(Event.id == "evt_trilogy_sunburn").one()
            info, pax = _acquire_table_allocation(db2, ev2, cat_id, 1)
            db2.commit()
            return True
        except Exception:
            db2.rollback()
            return False
        finally:
            db2.close()

    # Attempt more allocations than exist — only `remaining` should succeed.
    with ThreadPoolExecutor(max_workers=16) as ex:
        results = list(ex.map(worker, range(remaining + 8)))
    allocated = sum(1 for r in results if r)

    assert allocated <= remaining
    db2 = db_infra.SessionLocal()
    try:
        ev2 = db2.query(Event).filter(Event.id == "evt_trilogy_sunburn").one()
        cat2 = next(c for c in (ev2.table_categories or []) if c["id"] == cat_id)
        assert cat2["booked_tables"] <= cat2["total_tables"]
    finally:
        db2.close()
