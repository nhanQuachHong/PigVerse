"use client";

import Image from "next/image";

import { getStoryContent } from "../../lib/story-content";
import { useLocale } from "../i18n/locale-provider";
import { ButtonLink } from "../ui/button";
import { PageContainer } from "../ui/page-container";

export function StoryView() {
  const { locale } = useLocale();
  const vi = locale === "vi";
  const story = getStoryContent(locale);

  return (
    <article className="pv-story-page">
      <section className="pv-story-hero">
        <PageContainer className="pv-story-hero__inner">
          <div>
            <p className="pv-eyebrow">Small pigs. Big adventures.</p>
            <h1>{vi ? "Câu chuyện Pigverse" : "The Pigverse Story"}</h1>
            <p>
              {vi
                ? "Một không gian truyện song ngữ dành cho thế giới kết nối của 10 nhân vật Pigverse Genesis."
                : "A bilingual story space for the connected world of the 10 Pigverse Genesis characters."}
            </p>
            <ButtonLink href="/collection">
              {vi ? "Gặp 10 nhân vật" : "Meet the 10 characters"}
            </ButtonLink>
          </div>
          <Image
            alt=""
            height={700}
            priority
            src="/assets/backgrounds/story-world.png"
            width={1000}
          />
        </PageContainer>
      </section>

      <PageContainer className="pv-story-content">
        {story.status === "pending-approval" && (
          <aside className="pv-card pv-story-pending" role="status">
            <strong>
              {vi
                ? "Truyện chính thức đang chờ phê duyệt"
                : "Official story pending approval"}
            </strong>
            <p>
              {vi
                ? "Bản truyện VI/EN cuối cùng chưa được Product Owner cung cấp. Các hình minh họa đã được đặt đúng cấu trúc, nhưng Pigverse không xuất bản nội dung tạm như canon."
                : "Final VI/EN story copy has not been supplied by the Product Owner. Approved illustrations are placed in the intended structure, but Pigverse does not publish placeholder copy as canon."}
            </p>
          </aside>
        )}

        <div className="pv-story-chapters">
          {story.chapters.map((chapter, index) => (
            <section className="pv-card pv-story-chapter" key={chapter.artwork}>
              <Image alt="" height={720} src={chapter.artwork} width={1080} />
              <div>
                <p className="pv-eyebrow">
                  {vi ? `Chương ${index + 1}` : `Chapter ${index + 1}`}
                </p>
                <h2>
                  {chapter.title ??
                    (vi
                      ? "Đang chờ nội dung được duyệt"
                      : "Approved copy pending")}
                </h2>
                <p>
                  {chapter.body ??
                    (vi
                      ? "Phần này sẽ hiển thị bản truyện tiếng Việt đã được phê duyệt cùng bản tiếng Anh tương ứng."
                      : "This section will contain the approved English story and its corresponding Vietnamese version.")}
                </p>
              </div>
            </section>
          ))}
        </div>

        <section className="pv-story-cta">
          <p className="pv-eyebrow">Pigverse Genesis · 10 NFTs</p>
          <h2>
            {vi
              ? "Mỗi nhân vật là một NFT độc bản 1/1."
              : "Every character is a unique 1/1 NFT."}
          </h2>
          <ButtonLink href="/collection" size="lg">
            {vi ? "Khám phá bộ sưu tập" : "Explore the collection"}
          </ButtonLink>
        </section>
      </PageContainer>
    </article>
  );
}
