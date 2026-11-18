import re
import pathlib

root = pathlib.Path(__file__).resolve().parents[1] / "src" / "app" / "api"
for path in root.rglob("route.ts"):
    text = path.read_text(encoding="utf-8")
    if "supabase.auth.getUser()" not in text:
        continue
    if "getApiUser" not in text:
        text = re.sub(
            r"import \{ createClient([^}]*)\} from '@/lib/supabase/server'",
            r"import { createClient\1, getApiUser } from '@/lib/supabase/server'",
            text,
            count=1,
        )
    text = text.replace("await supabase.auth.getUser()", "await getApiUser(supabase)")
    path.write_text(text, encoding="utf-8")
    print("updated", path.relative_to(root.parents[2]))
