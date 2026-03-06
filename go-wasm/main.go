// NovelNest Go WASM
// Build: cd go-wasm && make tiny (TinyGo recommended)
package main

import (
	"math"
	"strings"
	"syscall/js"
	"unicode"
)

func main() {
	obj := js.Global().Get("Object").New()
	obj.Set("searchScore",  js.FuncOf(jsSearchScore))
	obj.Set("rankScore",    js.FuncOf(jsRankScore))
	obj.Set("readingTime",  js.FuncOf(jsReadingTime))
	obj.Set("excerptText",  js.FuncOf(jsExcerptText))
<<<<<<< HEAD
	js.Global().Set("NoveloraWasm", obj)
=======
	js.Global().Set("NovelNestWasm", obj)
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
	select {}
}

func jsSearchScore(_ js.Value, args []js.Value) any {
	if len(args) < 2 { return 0.0 }
	desc := ""; if len(args) > 2 { desc = args[2].String() }
	return searchScore(args[0].String(), args[1].String(), desc)
}

func searchScore(query, title, desc string) float64 {
	qToks := tokenize(query)
	if len(qToks) == 0 { return 0 }
	tSet := toSet(tokenize(title))
	dSet := toSet(tokenize(desc))
	hits := 0.0
	for _, q := range qToks {
		if tSet[q] { hits += 2.0 } else if dSet[q] { hits += 1.0 }
	}
	return math.Min(hits/(float64(len(qToks))*2.0), 1.0)
}

func jsRankScore(_ js.Value, args []js.Value) any {
	if len(args) < 3 { return 0.0 }
	age := 0.0; if len(args) > 3 { age = args[3].Float() }
	return rankScore(args[0].Float(), args[1].Float(), args[2].Float(), age)
}

func rankScore(views, likes, rating, age float64) float64 {
	v := math.Log1p(views) / math.Log1p(10_000_000)
	l := math.Log1p(likes) / math.Log1p(500_000)
	r := (rating - 1.0) / 4.0
	d := 1.0 / (1.0 + age/720.0)
	return math.Round((v*0.40+l*0.30+r*0.30)*d*1_000_000) / 1_000_000
}

func jsReadingTime(_ js.Value, args []js.Value) any {
	if len(args) < 1 { return 1 }
	return int(math.Max(1, math.Ceil(args[0].Float()/250.0)))
}

func jsExcerptText(_ js.Value, args []js.Value) any {
	if len(args) < 1 { return "" }
	max := 200; if len(args) > 1 { max = args[1].Int() }
	runes := []rune(args[0].String())
	if len(runes) <= max { return args[0].String() }
	cut := string(runes[:max])
	if idx := strings.LastIndex(cut, " "); idx > max/2 { cut = cut[:idx] }
	return cut + "…"
}

func tokenize(s string) []string {
	s = strings.ToLower(s)
	var tokens []string
	var cur strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) { cur.WriteRune(r) } else {
			if cur.Len() > 1 { tokens = append(tokens, cur.String()) }
			cur.Reset()
		}
	}
	if cur.Len() > 1 { tokens = append(tokens, cur.String()) }
	return tokens
}

func toSet(tokens []string) map[string]bool {
	m := make(map[string]bool, len(tokens))
	for _, t := range tokens { m[t] = true }
	return m
}
