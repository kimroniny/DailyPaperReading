from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any, Optional

USER_AGENT = "DailyPaperReading/1.0 (mailto:paper-radar@example.com)"


def fetch_bytes(url: str, timeout: int = 60, retries: int = 4) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last: Optional[Exception] = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            last = exc
            code = getattr(exc, "code", None)
            if code is not None and code != 429 and code < 500:
                raise
            if attempt + 1 >= retries:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise last  # type: ignore[misc]


def fetch_text(url: str, timeout: int = 60) -> str:
    return fetch_bytes(url, timeout=timeout).decode("utf-8", errors="replace")


def fetch_json(url: str, timeout: int = 60) -> Any:
    return json.loads(fetch_text(url, timeout=timeout))
