OUT = ../frontend/public/wasm/novelora.wasm
.PHONY: build tiny
build: ; mkdir -p $(dir $(OUT)) && GOARCH=wasm GOOS=js go build -ldflags="-s -w" -o $(OUT) . && echo "✓ $(shell du -sh $(OUT) | cut -f1)"
tiny:  ; mkdir -p $(dir $(OUT)) && tinygo build -o $(OUT) -target wasm -opt=2 -no-debug . && echo "✓ TinyGo $(shell du -sh $(OUT) | cut -f1)"
