import Image from "next/image";

export function Footer() {
  return (
    <div className="absolute -bottom-35 lg:-bottom-70 left-0 -z-1 w-full h-75 lg:h-150 overflow-hidden">
      <Image
        className="w-full h-full z-0 object-cover"
        style={{
          maskImage: "url('/images/footer.png')",
          WebkitMaskImage: "url('/images/footer.png')",
          maskRepeat: "repeat-x",
          WebkitMaskRepeat: "repeat-x",
          maskSize: "auto 100%",
          WebkitMaskSize: "auto 100%",
        }}
        src={"/images/footer-image-1.jpg"}
        alt="Footer"
        fill
      />
    </div>
  );
}
