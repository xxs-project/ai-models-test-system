with open("BenchLocal/run_benchlocal.sh", "r") as f:
    content = f.read()

bad_str = """      }
    }
      }
    }

    try {"""

good_str = """

    try {"""

if bad_str in content:
    content = content.replace(bad_str, good_str)
    with open("BenchLocal/run_benchlocal.sh", "w") as f:
        f.write(content)
    print("Fixed syntax")
else:
    print("Could not find bad_str")
