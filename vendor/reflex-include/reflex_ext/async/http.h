#pragma once

#include "task.h"




//
//Primary API

namespace Reflex::Async
{

	using HttpHeaders = Array < Pair <CString> >;

	TRef <Task> CreateHttpRequest(const CString::View & method, const CString::View & url, const HttpHeaders & headers, const Data::Archive::View & body, DebugOutput & output = File::output);

}




//
//Detail API

REFLEX_NS(Reflex::Async::Detail)

struct HttpRequestCallbacks : public Object
{
	virtual TRef <System::HttpConnection> Connect(bool https, const CString::View & domain, UInt16 port) { return System::HttpConnection::Create(https, domain, port); }

	virtual bool OnResponse(System::HttpConnection::Response status_code) { return status_code >= 200 && status_code < 300; }

	virtual void OnHeader(const CString::View & key, const CString::View & value) = 0;
	
	virtual void OnChunk(const Data::Archive::View & chunk) = 0;
	
	virtual TRef <Object> OnComplete() = 0;
};

struct StandardHttpRequestCallbacks : public HttpRequestCallbacks	//for application/json, AsyncTask result will be Data::PropertySet, other Data::ArchiveObject
{
	void OnHeader(const CString::View & key, const CString::View & value) override;

	void OnChunk(const Data::Archive::View & chunk) override;

	TRef <Object> OnComplete() override;

	
	bool m_is_lz4 = false;

	bool m_is_json = false;

	Data::Archive m_body;
};

enum MaxByteRate : UInt32
{
	kMaxByteRateUnlimited = kMaxUInt32,
	kMaxByteRate384k = 48000,				//384 kbps
	kMaxByteRate2G3G = 125000,				//1 Mbps
	kMaxByteRateSlowMobile = 375000,		//3 Mbps
	kMaxByteRatePoor4G = 1000000,			//8 Mbps
	kMaxByteRateTypicalMobile = 2000000,	//16 Mbps
	kMaxByteRateBroadband = 8000000,		//64Mbps
	kMaxByteRateAlwaysFail = 0,		
};

TRef <Task> CreateHttpRequest(const CString::View & method, const CString::View & url, const HttpHeaders & headers, const Data::Archive::View & body, TRef <HttpRequestCallbacks> callbacks, MaxByteRate max_byte_rate = kMaxByteRateUnlimited, DebugOutput & output = File::output);

REFLEX_END




//
//impl

inline Reflex::TRef <Reflex::Async::Task> Reflex::Async::CreateHttpRequest(const CString::View & method, const CString::View & url, const HttpHeaders & headers, const Data::Archive::View & body, DebugOutput & output)
{
	return CreateHttpRequest(method, url, headers, body, New<Detail::StandardHttpRequestCallbacks>(), Detail::kMaxByteRateUnlimited, output);
}
