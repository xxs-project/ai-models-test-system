from sqlmodel import create_engine, Session, select, func
from backend.models import Benchmark
import sys

# Add backend to path
sys.path.append('backend')

sqlite_url = "sqlite:///backend/database.db"
engine = create_engine(sqlite_url)

with Session(engine) as session:
    count = session.exec(select(func.count(Benchmark.id))).one()
    print(f"Total benchmarks in DB: {count}")
    
    benchmarks = session.exec(select(Benchmark)).all()
    print("Benchmark IDs:", [b.id for b in benchmarks])
