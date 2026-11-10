// Draws the share card (og.jpg) and the icons from the photos and the Literata font in web/.
// Run on a Mac when the look changes: swift pipeline/make_images.swift
// The card carries no brand name, so renaming the brand in site.config.yaml never needs a new card.
import AppKit
import CoreText

let root = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let web = root.appendingPathComponent("web")

func hex(_ s: String) -> CGColor {
    let v = Int(s.dropFirst(), radix: 16)!
    return CGColor(srgbRed: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}
let ink = hex("#161616"), soft = hex("#55534f"), red = hex("#b0533d"), paper = hex("#f5f5f2")

func font(_ size: CGFloat, italic: Bool = false, weight: Int = 500) -> CTFont {
    let url = web.appendingPathComponent(italic ? "fonts/literata-italic.woff2" : "fonts/literata.woff2") as CFURL
    if let ds = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor], let d = ds.first {
        let wght = 0x77676874 as NSNumber   // the variable font's weight axis
        let heavier = CTFontDescriptorCreateCopyWithAttributes(d, [kCTFontVariationAttribute: [wght: weight]] as CFDictionary)
        return CTFontCreateWithFontDescriptor(heavier, size, nil)
    }
    return CTFontCreateWithName("Georgia" as CFString, size, nil)
}

func canvas(_ w: Int, _ h: Int) -> CGContext {
    CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
}

// one line of text centred on cx, its baseline `baseline` px from the top; each run is (text, font, colour, tracking in em)
func line(_ c: CGContext, _ runs: [(String, CTFont, CGColor, CGFloat)], cx: CGFloat, baseline: CGFloat) {
    let s = NSMutableAttributedString()
    for (t, f, col, track) in runs {
        s.append(NSAttributedString(string: t, attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): f,
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): col,
            NSAttributedString.Key(kCTKernAttributeName as String): CTFontGetSize(f) * track]))
    }
    let l = CTLineCreateWithAttributedString(s)
    let w = CTLineGetTypographicBounds(l, nil, nil, nil)
    c.textPosition = CGPoint(x: cx - CGFloat(w) / 2, y: CGFloat(c.height) - baseline)
    CTLineDraw(l, c)
}

// a photo cropped to fill rect, `focus` choosing which part of the photo stays (0 = left/bottom, 1 = right/top)
func photo(_ c: CGContext, _ name: String, _ rect: CGRect, focus: CGPoint) {
    guard let src = NSImage(contentsOf: web.appendingPathComponent("img/\(name)")),
          let img = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
    let iw = CGFloat(img.width), ih = CGFloat(img.height)
    let scale = max(rect.width / iw, rect.height / ih)
    let cw = rect.width / scale, ch = rect.height / scale
    let crop = CGRect(x: (iw - cw) * focus.x, y: (ih - ch) * (1 - focus.y), width: cw, height: ch)   // image rows run top-down
    c.draw(img.cropping(to: crop)!, in: rect)
}

func save(_ data: Data, _ name: String) {
    try! data.write(to: web.appendingPathComponent(name))
    print("wrote web/\(name)")
}
func png(_ c: CGContext) -> Data { NSBitmapImageRep(cgImage: c.makeImage()!).representation(using: .png, properties: [:])! }

// ---------- og.jpg: the site's hero line on paper, a photo at each edge ----------
// Everything that matters sits in the middle 630px, so a square thumbnail (LinkedIn, WhatsApp) still reads.
let W: CGFloat = 1200, H: CGFloat = 630, side: CGFloat = 250
let og = canvas(Int(W), Int(H))
og.setFillColor(paper); og.fill(CGRect(x: 0, y: 0, width: W, height: H))
photo(og, "pink-bazaar-1600.jpg", CGRect(x: 0, y: 0, width: side, height: H), focus: CGPoint(x: 0.62, y: 0.5))
photo(og, "city-above-1600.jpg", CGRect(x: W - side, y: 0, width: side, height: H), focus: CGPoint(x: 0.5, y: 0.25))
let mid = W / 2
line(og, [("INDEPENDENT RESEARCH ON JAIPUR\u{2019}S BUSINESSES", font(17, weight: 600), red, 0.12)], cx: mid, baseline: 168)
line(og, [("Jaipur was", font(88), ink, -0.025)], cx: mid, baseline: 282)
line(og, [("built to ", font(88), ink, -0.025), ("trade.", font(88, italic: true), red, -0.02)], cx: mid, baseline: 372)
line(og, [("Free, checked data on what\u{2019}s really", font(27, weight: 400), ink, 0)], cx: mid, baseline: 448)
line(og, [("happening in the city\u{2019}s trades.", font(27, weight: 400), ink, 0)], cx: mid, baseline: 484)
line(og, [("Caf\u{00E9}s \u{00B7} Jewellery \u{00B7} More to come", font(20, weight: 400), soft, 0)], cx: mid, baseline: 548)
let rep = NSBitmapImageRep(cgImage: og.makeImage()!)
save(rep.representation(using: .jpeg, properties: [.compressionFactor: 0.86])!, "og.jpg")

// ---------- icons: a paper-coloured Literata P on the site's red ----------
let glyphFont = font(64, weight: 600)
var ch: UniChar = 0x50, glyph: CGGlyph = 0
CTFontGetGlyphsForCharacters(glyphFont, &ch, &glyph, 1)
let P = CTFontCreatePathForGlyph(glyphFont, glyph, nil)!
let pb = P.boundingBoxOfPath

// the P scaled to `share` of the icon's height and centred optically (a touch right, since the bowl carries the weight)
func placed(_ size: CGFloat, share: CGFloat = 0.6) -> CGAffineTransform {
    let k = size * share / pb.height
    let dx = (size - pb.width * k) / 2 - pb.minX * k + size * 0.015, dy = (size - pb.height * k) / 2 - pb.minY * k
    return CGAffineTransform(translationX: dx, y: dy).scaledBy(x: k, y: k)
}

func icon(_ size: Int, rounded: Bool) -> CGContext {
    let s = CGFloat(size), c = canvas(size, size)
    c.setFillColor(red)
    if rounded { c.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: s, height: s), cornerWidth: s * 0.22, cornerHeight: s * 0.22, transform: nil)); c.fillPath() }
    else { c.fill(CGRect(x: 0, y: 0, width: s, height: s)) }   // iOS rounds the corners itself
    var t = placed(s)
    c.setFillColor(paper); c.addPath(P.copy(using: &t)!); c.fillPath()
    return c
}
save(png(icon(180, rounded: false)), "apple-touch-icon.png")

// favicon.ico: one 32px PNG inside the six-byte ICO header and its sixteen-byte directory entry
let small = png(icon(32, rounded: true))
var ico = Data([0, 0, 1, 0, 1, 0, 32, 32, 0, 0, 1, 0, 32, 0])
withUnsafeBytes(of: UInt32(small.count).littleEndian) { ico.append(contentsOf: $0) }
withUnsafeBytes(of: UInt32(22).littleEndian) { ico.append(contentsOf: $0) }
save(ico + small, "favicon.ico")

// favicon.svg: the same P as a path, flipped into SVG's top-down coordinates
var flip = CGAffineTransform(translationX: 0, y: 64).scaledBy(x: 1, y: -1).concatenating(.identity)
flip = placed(64).concatenating(flip)
var d = ""
P.copy(using: &flip)!.applyWithBlock { el in
    let p = el.pointee.points, f = { (q: CGPoint) in String(format: "%.2f %.2f", q.x, q.y) }
    switch el.pointee.type {
    case .moveToPoint: d += "M\(f(p[0]))"
    case .addLineToPoint: d += "L\(f(p[0]))"
    case .addQuadCurveToPoint: d += "Q\(f(p[0])) \(f(p[1]))"
    case .addCurveToPoint: d += "C\(f(p[0])) \(f(p[1])) \(f(p[2]))"
    case .closeSubpath: d += "Z"
    @unknown default: break
    }
}
save(Data("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><rect width=\"64\" height=\"64\" rx=\"14\" fill=\"#b0533d\"/><path d=\"\(d)\" fill=\"#f5f5f2\"/></svg>\n".utf8), "favicon.svg")
