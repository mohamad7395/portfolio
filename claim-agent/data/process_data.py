import csv

COLS = ["id","name","city","country","iata","icao","lat","lon",
        "alt","timezone","dst","tz_db","type","source"]

with open("data/airports_raw.dat", encoding="utf-8") as f_in, \
     open("data/airports.csv", "w", newline="", encoding="utf-8") as f_out:
    reader = csv.reader(f_in)
    writer = csv.writer(f_out)
    writer.writerow(["iata", "country", "lat", "lon"])
    for row in reader:
        row = dict(zip(COLS, row))
        if row["iata"] and row["iata"] != "\\N":
            writer.writerow([row["iata"], row["country"], row["lat"], row["lon"]])