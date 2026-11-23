import { PartnerPersona, Scenario } from '../types';

export const PARTNER_PERSONAS: PartnerPersona[] = [
  {
    id: 'xiaoyu',
    name: 'Lâm Tiểu Vũ',
    hanziName: '林小雨',
    voiceName: 'Zephyr',
    city: 'Bắc Kinh',
    style: 'Ấm áp, phát âm chuẩn phổ thông, kiên nhẫn gợi mở',
  },
  {
    id: 'chenming',
    name: 'Trần Minh',
    hanziName: '陈明',
    voiceName: 'Puck',
    city: 'Thượng Hải',
    style: 'Tự nhiên, vui vẻ, hay dùng khẩu ngữ trẻ trung',
  },
  {
    id: 'meilin',
    name: 'Tô Mỹ Lâm',
    hanziName: '苏美林',
    voiceName: 'Kore',
    city: 'Hàng Châu',
    style: 'Nhẹ nhàng, rõ ràng, thích hợp luyện nghe chậm',
  },
  {
    id: 'haoran',
    name: 'Lý Hạo Nhiên',
    hanziName: '李浩然',
    voiceName: 'Charon',
    city: 'Thành Đô',
    style: 'Điềm tĩnh, thân thiện, phù hợp giao tiếp công sở',
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'coffee-shanghai',
    title: 'Gọi cà phê & trà sữa',
    hanziTitle: '在咖啡馆点单',
    category: 'Đời sống',
    recommendedLevel: 'HSK 1–2',
    description:
      'Gọi đồ uống tại một quán nhỏ ở Thượng Hải: chọn ít đường, ít đá, hỏi món bán chạy và trò chuyện ngắn với nhân viên pha chế.',
    partnerRole: 'Nhân viên pha chế thân thiện tại một quán trà và cà phê thủ công ở Thượng Hải.',
    userRole: 'Khách ghé quán lần đầu muốn gọi đồ uống phù hợp với thời tiết hôm nay.',
    openingGoal: 'Gọi được 1 đồ uống, tùy chỉnh độ ngọt/đá và hỏi thêm 1 gợi ý của quán.',
    imageUrl: '/src/assets/images/scene_coffee_shanghai_1795403665351.jpg',
    starterPhrases: [
      { hanzi: '你好，请问这里有什么推荐的吗？', pinyin: 'Nǐ hǎo, qǐngwèn zhèlǐ yǒu shénme tuījiàn de ma?', vietnamese: 'Chào bạn, ở đây có món gì gợi ý không?' },
      { hanzi: '我要一杯拿铁，少糖、少冰。', pinyin: 'Wǒ yào yī bēi nátiě, shǎo táng, shǎo bīng.', vietnamese: 'Cho tôi một ly latte, ít đường, ít đá.' },
      { hanzi: '在这里喝还是打包？', pinyin: 'Zài zhèlǐ hē háishi dǎbāo?', vietnamese: 'Uống tại quán hay mang đi?' },
    ],
  },
  {
    id: 'night-market',
    title: 'Khám phá chợ đêm ẩm thực',
    hanziTitle: '逛成都夜市',
    category: 'Ẩm thực & Du lịch',
    recommendedLevel: 'HSK 3–4',
    description:
      'Dạo phố ẩm thực buổi tối ở Thành Đô: hỏi thành phần món ăn, chọn độ cay vừa miệng và trò chuyện tự nhiên với chủ quầy.',
    partnerRole: 'Chủ quầy sủi cảo và đồ ăn vặt nhiệt tình tại chợ đêm Thành Đô.',
    userRole: 'Du khách Việt Nam mê ẩm thực muốn thử đặc sản địa phương nhưng ăn cay vừa phải.',
    openingGoal: 'Hỏi tên món, điều chỉnh độ cay (微辣) và thanh toán qua mã QR.',
    imageUrl: '/src/assets/images/scene_night_market_1795403664941.jpg',
    starterPhrases: [
      { hanzi: '老板，这个怎么卖？', pinyin: 'Lǎobǎn, zhège zěnme mài?', vietnamese: 'Chủ quán ơi, món này bán thế nào?' },
      { hanzi: '可以做微辣吗？我不太能吃辣。', pinyin: 'Kěyǐ zuò wēilà ma? Wǒ bù tài néng chī là.', vietnamese: 'Làm cay nhẹ được không? Tôi không ăn cay giỏi lắm.' },
      { hanzi: '味道真香，我可以扫码付款吗？', pinyin: 'Wèidào zhēn xiāng, wǒ kěyǐ sǎomǎ fùkuǎn ma?', vietnamese: 'Thơm quá, tôi quét mã thanh toán được không?' },
    ],
  },
  {
    id: 'office-colleagues',
    title: 'Trò chuyện cùng đồng nghiệp',
    hanziTitle: '和同事聊日常',
    category: 'Công sở',
    recommendedLevel: 'HSK 3–4',
    description:
      'Giờ nghỉ trưa tại văn phòng: hỏi thăm tiến độ công việc, rủ nhau đi ăn trưa và chia sẻ kế hoạch cuối tuần một cách thoải mái.',
    partnerRole: 'Đồng nghiệp cùng nhóm vui tính tại văn phòng thiết kế ở Bắc Kinh.',
    userRole: 'Thành viên mới trong nhóm đang làm quen và trò chuyện giờ giải lao.',
    openingGoal: 'Hỏi thăm công việc buổi sáng, bàn chọn quán ăn trưa và chia sẻ lịch cuối tuần.',
    imageUrl: '/src/assets/images/scene_office_colleagues_1795403665754.jpg',
    starterPhrases: [
      { hanzi: '今天上午忙不忙？', pinyin: 'Jīntiān shàngwǔ máng bù máng?', vietnamese: 'Sáng nay bạn có bận không?' },
      { hanzi: '中午一起去附近吃点什么吧？', pinyin: 'Zhōngwǔ yīqǐ qù fùjìn chī diǎn shénme ba?', vietnamese: 'Trưa nay cùng ra gần đây ăn gì đó nhé?' },
      { hanzi: '周末你有什么打算吗？', pinyin: 'Zhōumò nǐ yǒu shénme dǎsuàn ma?', vietnamese: 'Cuối tuần này bạn có dự định gì không?' },
    ],
  },
  {
    id: 'weekend-park',
    title: 'Đi dạo công viên cuối tuần',
    hanziTitle: '周末公园散步',
    category: 'Kết bạn',
    recommendedLevel: 'HSK 1–2',
    description:
      'Gặp một người bạn địa phương khi đi dạo buổi sáng bên hồ: nói về thời tiết, sở thích chụp ảnh, tập thể dục và thói quen mỗi ngày.',
    partnerRole: 'Người bạn bản xứ vui vẻ hay chạy bộ và uống trà sáng ở công viên Tây Hồ.',
    userRole: 'Người bạn mới quen đang tận hưởng buổi sáng cuối tuần thảnh thơi.',
    openingGoal: 'Khen thời tiết, chia sẻ 1–2 sở thích cá nhân và hẹn buổi gặp tiếp theo.',
    imageUrl: '/src/assets/images/scene_weekend_park_1795403665355.jpg',
    starterPhrases: [
      { hanzi: '今天天气真舒服，出来走走太好了。', pinyin: 'Jīntiān tiānqì zhēn shūfu, chūlái zǒuzou tài hǎo le.', vietnamese: 'Thời tiết hôm nay dễ chịu thật, ra ngoài đi dạo thích quá.' },
      { hanzi: '你平时周末喜欢做什么？', pinyin: 'Nǐ píngshí zhōumò xǐhuan zuò shénme?', vietnamese: 'Bình thường cuối tuần bạn thích làm gì?' },
      { hanzi: '下次有空我们一起喝茶吧。', pinyin: 'Xià cì yǒukòng wǒmen yīqǐ hē chá ba.', vietnamese: 'Lần sau rảnh chúng ta cùng đi uống trà nhé.' },
    ],
  },
  {
    id: 'subway-directions',
    title: 'Hỏi đường & đi tàu điện ngầm',
    hanziTitle: '问路与坐地铁',
    category: 'Di chuyển',
    recommendedLevel: 'HSK 1–2',
    description:
      'Hỏi người đi đường cách chuyển tuyến tàu điện ngầm, tìm lối ra gần bảo tàng và ước lượng thời gian di chuyển.',
    partnerRole: 'Người dân địa phương nhiệt tình đang đứng chờ tàu tại ga trung chuyển.',
    userRole: 'Người lần đầu tự đi tàu điện ngầm đến khu phố cổ.',
    openingGoal: 'Hỏi số tuyến cần đổi, số trạm còn lại và cửa ra (出口) thuận tiện nhất.',
    starterPhrases: [
      { hanzi: '打扰一下，去博物馆怎么坐地铁？', pinyin: 'Dǎrǎo yīxià, qù bówùguǎn zěnme zuò dìtiě?', vietnamese: 'Xin lỗi làm phiền chút, đi bảo tàng thì bắt tàu điện thế nào?' },
      { hanzi: '需要换乘几号线？', pinyin: 'Xūyào huànchéng jǐ hào xiàn?', vietnamese: 'Cần chuyển sang tuyến số mấy ạ?' },
      { hanzi: '从哪个出口出去最近？', pinyin: 'Cóng nǎge chūkǒu chūqù zuì jìn?', vietnamese: 'Đi từ cửa ra nào thì gần nhất?' },
    ],
  },
  {
    id: 'daily-free-chat',
    title: 'Tự do trò chuyện mỗi ngày',
    hanziTitle: '每日自由闲聊',
    category: 'Tự do',
    recommendedLevel: 'HSK 5–6',
    description:
      'Trò chuyện cởi mở như hai người bạn thân: kể chuyện ngày hôm nay, bàn về một bộ phim hay, thói quen sống hoặc kế hoạch sắp tới.',
    partnerRole: 'Người bạn thân người Trung Quốc am hiểu văn hóa, thích trò chuyện tự nhiên và hài hước.',
    userRole: 'Người bạn đang luyện phản xạ nói tiếng Trung tự nhiên hàng ngày.',
    openingGoal: 'Duy trì cuộc hội thoại tự nhiên trên 6 lượt, thử diễn đạt cảm xúc và quan điểm cá nhân.',
    starterPhrases: [
      { hanzi: '最近过得怎么样？有什么新鲜事吗？', pinyin: 'Zuìjìn guò de zěnmeyàng? Yǒu shénme xīnxiān shì ma?', vietnamese: 'Dạo này thế nào? Có chuyện gì mới mẻ không?' },
      { hanzi: '我最近在看一部挺有意思的电影。', pinyin: 'Wǒ zuìjìn zài kàn yī bù tǐng yǒuyìsi de diànyǐng.', vietnamese: 'Gần đây mình đang xem một bộ phim khá thú vị.' },
      { hanzi: '说实话，我觉得这样挺自然的。', pinyin: 'Shuō shíhuà, wǒ juéde zhèyàng tǐng zìrán de.', vietnamese: 'Nói thật là mình thấy như vậy khá tự nhiên.' },
    ],
  },
];

export const HSK_LEVEL_DESCRIPTIONS: Record<string, string> = {
  'HSK 1–2': 'Câu ngắn, từ vựng cơ bản, tốc độ chậm rãi dễ theo kịp.',
  'HSK 3–4': 'Giao tiếp đời sống tự nhiên, thêm thành ngữ thông dụng và nối câu.',
  'HSK 5–6': 'Tốc độ bản xứ, khẩu ngữ linh hoạt, thảo luận sâu và sắc thái tự nhiên.',
};
