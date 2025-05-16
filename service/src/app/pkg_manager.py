import os
import subprocess

def installPkg(pkg_str):
    try:
        command = ["pip", "install", "--target", "/home/dev/python-packages"] + pkg_str
        result = subprocess.run(command,check=True, text=True, capture_output=True)    
        print("Standard Output:",flush=True)
        print(result.stdout,flush=True)
        if result.stderr:
            print("Standard Error:",flush=True)
            print(result.stderr,flush=True)
        print("Packages installed successfully.",flush=True)
    except subprocess.CalledProcessError as e:
        print("An error occured while installing Python packages.",flush=True)
        print(e.stderr, flush=True)

def listPkg():
    try:
        command = "pip freeze --path /home/dev/python-packages > /home/dev/pkg.txt"
        subprocess.run(command,shell=True)
        with open("/home/dev/pkg.txt",'r') as file:
            pkgs = file.read()
            return pkgs
    except FileNotFoundError:
        print("File not found")
    except IOError as e:
        print(e)